from collections import Counter
from uuid import uuid4

from fastapi import HTTPException
from psycopg import sql
from psycopg.types.json import Jsonb
from pypinyin import Style, lazy_pinyin

from app.auth.dependencies import user_id
from app.corpus.database import connect


def resolve(db, kind, text):
    if not text:
        return None
    table, field, stats, column = (
        ("characters", "value", "story_character_stats", "character_id")
        if kind == "character"
        else ("segments", "text", "story_segment_stats", "segment_id")
    )
    rows = db.execute(
        sql.SQL("""SELECT c.id,c.{field} AS original,c.{traditional} AS traditional,c.{simplified} AS simplified
        FROM corpus.{table} c WHERE (c.{field}=%s OR c.{traditional}=%s OR c.{simplified}=%s)
        AND EXISTS(SELECT 1 FROM corpus.{stats} st JOIN corpus.stories d ON d.id=st.story_id
          WHERE st.{column}=c.id AND d.user_id=%s AND d.status='completed') ORDER BY c.id""").format(
            traditional=sql.Identifier("traditional_" + field),
            simplified=sql.Identifier("simplified_" + field),
            field=sql.Identifier(field),
            table=sql.Identifier(table),
            stats=sql.Identifier(stats),
            column=sql.Identifier(column),
        ),
        (text, text, text, user_id()),
    ).fetchall()
    exact = [row for row in rows if row["original"] == text]
    matches = exact or rows
    if len(matches) != 1:
        return {
            "text": text,
            "id": None,
            "reason": "Target not found in your completed corpus"
            if not matches
            else "Ambiguous script variant; use the original corpus form",
        }
    return {**matches[0], "text": text}


def start(identifier):
    lesson_identifier = identifier
    with connect() as db:
        lesson = db.execute(
            "SELECT document FROM corpus.lessons WHERE id=%s AND user_id=%s",
            (identifier, user_id()),
        ).fetchone()
        if not lesson:
            raise HTTPException(404, "Lesson not found")
        document = lesson["document"]
        targets = {
            item["id"]: {
                kind: resolve(db, kind, item["data"].get("target-" + kind))
                for kind in ("character", "segment")
            }
            for item in document["items"]
        }
        identifier = uuid4()
        db.execute(
            "INSERT INTO corpus.lesson_attempts(id,user_id,lesson_id,document,targets) VALUES (%s,%s,%s,%s,%s)",
            (identifier, user_id(), lesson_identifier, Jsonb(document), Jsonb(targets)),
        )
    return {"id": identifier, "document": document, "targets": targets}


def finish(identifier, raw):
    with connect() as db:
        attempt = db.execute(
            "SELECT * FROM corpus.lesson_attempts WHERE id=%s AND user_id=%s FOR UPDATE",
            (identifier, user_id()),
        ).fetchone()
        if not attempt:
            raise HTTPException(404, "Attempt not found")
        if attempt["result"] is not None:
            return with_pinyin(attempt["result"])
        items = attempt["document"]["items"]
        if (
            not isinstance(raw, dict)
            or set(raw) != {"answers"}
            or not isinstance(raw["answers"], list)
        ):
            raise HTTPException(422, "Provide an answers array")
        answers = raw["answers"]
        if len(answers) != len(items):
            raise HTTPException(422, "Submit one answer for every lesson item")
        by_id = {}
        for answer in answers:
            if not isinstance(answer, dict) or set(answer) not in ({"item_id", "option_id"}, {"item_id", "answer"}) or not isinstance(answer.get("item_id"), str) or answer["item_id"] in by_id:
                raise HTTPException(422, "Invalid or duplicate item IDs")
            by_id[answer["item_id"]] = answer
        if set(by_id) != {item["id"] for item in items}:
            raise HTTPException(422, "Answer item IDs do not match the lesson")
        counts = {"character": Counter(), "segment": Counter()}
        summary = {"characters": [], "segments": [], "unresolved": []}
        correct = 0
        for item in items:
            question = item["data"]
            submitted = by_id[item["id"]]
            if item['type'] == 'multiple-choice':
                selected = submitted.get('option_id')
                if not isinstance(selected,str) or selected not in {option['id'] for option in question['options']}:
                    raise HTTPException(422, "Unknown answer option")
                right = selected == question['answer']
            else:
                right = grade_activity(item, submitted.get('answer'))
            correct += int(right)
            for kind, target in attempt["targets"][item["id"]].items():
                if target and target.get("id") and right:
                    counts[kind][target["id"]] += 1
        for kind in ("character", "segment"):
            targets = {}
            for target_set in attempt["targets"].values():
                target = target_set[kind]
                if not target:
                    continue
                if target.get("id"):
                    targets[target["id"]] = target
                elif {"kind": kind, **target} not in summary["unresolved"]:
                    summary["unresolved"].append({"kind": kind, **target})
            for target_id in sorted(targets):
                target = targets[target_id]
                points = counts[kind][target_id]
                # Recheck ownership if a corpus was changed while the attempt was open.
                available = resolve(db, kind, target["original"])
                if not available or available.get("id") != target_id:
                    summary["unresolved"].append(
                        {
                            "kind": kind,
                            "text": target["text"],
                            "reason": "Target no longer available",
                        }
                    )
                    continue
                if points:
                    db.execute(
                        sql.SQL("""INSERT INTO corpus.{} AS p (user_id,{},practice) VALUES (%s,%s,%s)
                      ON CONFLICT(user_id,{}) DO UPDATE SET practice=p.practice+EXCLUDED.practice""").format(
                            sql.Identifier("user_" + kind + "_progress"),
                            sql.Identifier(kind + "_id"),
                            sql.Identifier(kind + "_id"),
                        ),
                        (user_id(), target_id, points),
                    )
                row = db.execute(
                    sql.SQL(
                        "SELECT learned,learning,practice FROM corpus.{} WHERE user_id=%s AND {}=%s"
                    ).format(
                        sql.Identifier("user_" + kind + "_progress"),
                        sql.Identifier(kind + "_id"),
                    ),
                    (user_id(), target_id),
                ).fetchone() or {"learned": False, "learning": False, "practice": 0}
                summary[kind + "s"].append({**target, **row, "earned": points})
        result = {
            "correct": correct,
            "incorrect": len(items) - correct,
            "total": len(items),
            **summary,
        }
        db.execute(
            "UPDATE corpus.lesson_attempts SET completed_at=now(),result=%s WHERE id=%s",
            (Jsonb(result), identifier),
        )
    return with_pinyin(result)


def with_pinyin(result):
    for kind in ("characters", "segments"):
        for target in result[kind]:
            target["pinyin"] = " ".join(
                lazy_pinyin(target["original"], style=Style.TONE)
            )
    return result


def grade_activity(item, answer):
    if not isinstance(answer, dict):
        raise HTTPException(422, 'Missing activity answer')
    data = item['data']
    if item['type'] == 'sentence-jumble':
        ids = answer.get('tile_ids')
        if set(answer) != {'tile_ids'} or not isinstance(ids,list) or not all(isinstance(i,str) for i in ids) or len(ids)!=len(set(ids)) or not set(ids)<= {t['id'] for t in data['tiles']}:
            raise HTTPException(422, 'Invalid tile answer')
        return ids in data['answers']
    if item['type'] == 'matching-pairs':
        ids = answer.get('pair_ids')
        if set(answer) != {'pair_ids'} or not isinstance(ids,list) or not all(isinstance(i,str) for i in ids) or len(ids)!=len(set(ids)) or not set(ids)<= {p['id'] for p in data['pairs']}:
            raise HTTPException(422, 'Invalid pair answer')
        return set(ids) == {p['id'] for p in data['pairs']}
    if item['type'] == 'reading':
        checkpoints = answer.get('checkpoints')
        expected = {b['id']:b['question'] for b in data['blocks'] if b['type']=='Multiple-choice'}
        if set(answer) != {'checkpoints'} or not isinstance(checkpoints,dict) or set(checkpoints)!=set(expected):
            raise HTTPException(422, 'Submit every reading checkpoint')
        for identifier, q in expected.items():
            if not isinstance(checkpoints[identifier],str) or checkpoints[identifier] not in {o['id'] for o in q['options']}:
                raise HTTPException(422, 'Invalid reading checkpoint option')
        return all(checkpoints[i]==q['answer'] for i,q in expected.items())
    raise HTTPException(422, 'Unsupported activity')
