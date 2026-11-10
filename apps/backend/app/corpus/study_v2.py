"""Unlearned segments in Learned-character sentence order, independent of popularity."""

from uuid import uuid4

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from psycopg.types.json import Jsonb

from app.auth.dependencies import user_id
from app.corpus.database import connect
from app.corpus.story_filter import story_predicate
from app.corpus.practice import ranking_cte
from app.corpus.script_forms import hydrate_forms
from app.corpus.study import select_study


def generate(learned_count, segment_count, story_ids=None):
    if learned_count + segment_count == 0:
        raise HTTPException(422, 'Request at least one character or segment')
    owner = user_id()
    base = select_study(learned_count, 0, story_ids) if learned_count else {
        'learned': [], 'new': [], 'available': {'learned': 0, 'new': 0},
    }
    with connect() as db:
        # Rank complete logical sentences, including all their stored fragments.
        # Keep each segment's first occurrence in that order before applying LIMIT.
        segments = db.execute(
            ranking_cte(story_ids) + """, candidates AS (
                SELECT v.*,s.id AS sentence_id,coalesce(r.matched_count,0) AS learned_sentence_count,
                  s.story_id,s.sentence_position,s.position AS fragment_position,o.position AS segment_position,
                  row_number() OVER(PARTITION BY v.id ORDER BY coalesce(r.matched_count,0) DESC,
                    s.story_id,s.sentence_position,s.position,o.position) AS choice
                FROM corpus.segment_occurrences o
                JOIN corpus.segments v ON v.id=o.segment_id AND v.is_word
                JOIN corpus.sentences s ON s.id=o.sentence_id
                JOIN corpus.stories d ON d.id=s.story_id AND d.user_id=%s AND d.status='completed'""" + story_predicate(story_ids) + """
                LEFT JOIN ranked r ON r.story_id=s.story_id AND r.sentence_position=s.sentence_position
                LEFT JOIN corpus.user_segment_progress p ON p.segment_id=v.id AND p.user_id=%s
                WHERE NOT coalesce(p.learned,false)
                  AND EXISTS (
                    SELECT 1 FROM corpus.segment_characters sc
                    JOIN corpus.characters c ON c.id=sc.character_id AND c.is_han
                    WHERE sc.segment_id=v.id
                  )
            ) SELECT *,count(*) OVER() AS available_count FROM candidates WHERE choice=1
            ORDER BY learned_sentence_count DESC,story_id,sentence_position,fragment_position,segment_position,id
            LIMIT %s""",
            (owner, owner, False, owner, owner, segment_count),
        ).fetchall() if segment_count else []
        available = segments[0]['available_count'] if segments else 0
        for segment in segments:
            hydrate_forms(segment, 'text', vocabulary=True)
            sentence = db.execute(
                'SELECT * FROM corpus.sentences WHERE id=%s', (segment.pop('sentence_id'),),
            ).fetchone()
            hydrate_forms(sentence, 'raw_text')
            segment['sentence'] = sentence
            segment.pop('available_count')
            segment.pop('choice')
        data = {
            **base, 'version': 2, 'segments': segments, 'story_ids': list(story_ids or []),
            'requested': {'learned': learned_count, 'new': 0, 'segments': segment_count},
            'available': {**base['available'], 'segments': available},
        }
        saved = db.execute(
            'INSERT INTO corpus.study_history_v2(id,user_id,data) VALUES (%s,%s,%s) RETURNING id,created_at',
            (uuid4(), owner, Jsonb(jsonable_encoder(data))),
        ).fetchone()
    return {**saved, 'data': data}


def listing(offset):
    with connect() as db:
        rows = db.execute(
            """SELECT id,created_at,data->'requested' AS requested FROM corpus.study_history_v2
            WHERE user_id=%s ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET %s""",
            (user_id(), offset),
        ).fetchall()
    return {'items': rows[:50], 'next': offset + 50 if len(rows) > 50 else None}


def retrieve(identifier):
    with connect() as db:
        row = db.execute(
            'SELECT id,created_at,data FROM corpus.study_history_v2 WHERE id=%s AND user_id=%s',
            (identifier, user_id()),
        ).fetchone()
    if not row:
        raise HTTPException(404, 'Saved selection not found')
    return row
