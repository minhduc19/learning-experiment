"""Durable PostgreSQL jobs. A session advisory lock fences each import worker."""

import argparse
import logging
import time
from hashlib import sha256
from importlib.metadata import version

import jieba

from app.corpus.config import MAX_SEGMENT_CHARACTERS, storage_directory
from app.corpus.database import connect
from app.corpus.migrate import migrate
from app.corpus.text import fragments, is_han

logger = logging.getLogger(__name__)
SEGMENTATION_VERSION = (
    f"jieba-{version('jieba')}:default:HMM=false:segments-v1:framing-v1"
)


def fingerprint():
    # Include the packaged dictionary, so workers cannot silently resume with
    # a changed vocabulary even if the package version stays the same.
    with jieba.get_dict_file() as dictionary:
        digest = sha256()
        while chunk := dictionary.read(1024 * 1024):
            digest.update(chunk)
    return SEGMENTATION_VERSION + ":" + digest.hexdigest()


def path_for(upload_id):
    return storage_directory() / f"{upload_id}.txt"


def record_batch(db, story, batch, tokenizer):
    token_rows = []
    sentence_rows = []
    for fragment in batch:
        if not fragment.text:
            db.execute(
                "UPDATE corpus.sentences SET is_final=true WHERE story_id=%s AND position=%s",
                (story["id"], story["fragment_count"] - 1),
            )
            story["sentence_position"] += 1
            story["part_position"] = 0
            story["pending_boundary"] = False
            continue
        sid = story["fragment_count"]
        sentence_rows.append(
            (
                story["id"],
                sid,
                story["sentence_position"],
                story["part_position"],
                fragment.is_final,
                fragment.text,
                story["character_count"],
                story["character_count"] + len(fragment.text),
            )
        )
        offset = 0
        position = 0
        for token in tokenizer.cut(fragment.text, HMM=False):
            for start in range(0, len(token), MAX_SEGMENT_CHARACTERS):
                piece = token[start : start + MAX_SEGMENT_CHARACTERS]
                token_rows.append((sid, position, offset, piece))
                position += 1
                offset += len(piece)
        if offset != len(fragment.text):
            raise ValueError("Segmentation did not preserve every character")
        story["character_count"] += len(fragment.text)
        story["byte_offset"] += len(fragment.text.encode("utf-8"))
        story["fragment_count"] += 1
        story["sentence_position"] += int(fragment.is_final)
        story["part_position"] = 0 if fragment.is_final else story["part_position"] + 1
        story["pending_boundary"] = fragment.pending_boundary

    # Temporary tables and COPY keep per-character traffic out of the Python/SQL
    # round-trip path. All inserts, statistics and checkpoints commit together.
    db.execute("""CREATE TEMP TABLE sentence_batch
        (story_id uuid,position bigint,sentence_position bigint,part_position integer,
         is_final boolean,raw_text text,start_offset bigint,end_offset bigint) ON COMMIT DROP""")
    with db.cursor().copy("COPY sentence_batch FROM STDIN") as copy:
        for row in sentence_rows:
            copy.write_row(row)
    db.execute("""INSERT INTO corpus.sentences
        (story_id,position,sentence_position,part_position,is_final,raw_text,start_offset,end_offset)
        SELECT * FROM sentence_batch ORDER BY position""")
    db.execute(
        "CREATE TEMP TABLE token_batch (sentence_position bigint, position integer, start_offset integer, text text, is_word boolean) ON COMMIT DROP"
    )
    with db.cursor().copy("COPY token_batch FROM STDIN") as copy:
        for sid, position, offset, text in token_rows:
            copy.write_row(
                (sid, position, offset, text, any(c.isalnum() for c in text))
            )
    db.execute(
        "CREATE TEMP TABLE character_batch (value text PRIMARY KEY, is_han boolean) ON COMMIT DROP"
    )
    with db.cursor().copy("COPY character_batch FROM STDIN") as copy:
        for character in sorted({c for _, _, _, token in token_rows for c in token}):
            copy.write_row((character, is_han(character)))
    db.execute("""INSERT INTO corpus.characters(value,is_han)
        SELECT value,is_han FROM character_batch ORDER BY value ON CONFLICT DO NOTHING""")
    db.execute("""INSERT INTO corpus.segments(text,is_word)
        SELECT DISTINCT text, is_word FROM token_batch ORDER BY text ON CONFLICT DO NOTHING""")
    db.execute("""CREATE TEMP TABLE occurrence_batch ON COMMIT DROP AS
        WITH inserted AS (
          INSERT INTO corpus.segment_occurrences(segment_id,sentence_id,position,start_offset,end_offset)
          SELECT s.id,sn.id,b.position,b.start_offset,b.start_offset+char_length(b.text)
          FROM token_batch b JOIN corpus.segments s ON s.text=b.text
          JOIN sentence_batch sb ON sb.position=b.sentence_position
          JOIN corpus.sentences sn ON sn.story_id=sb.story_id AND sn.position=sb.position
          RETURNING id, segment_id
        ) SELECT * FROM inserted""")
    db.execute("""INSERT INTO corpus.segment_characters(segment_id,character_id,count_in_segment)
        SELECT s.id,c.id,count(*) FROM (SELECT DISTINCT segment_id FROM occurrence_batch) b
        JOIN corpus.segments s ON s.id=b.segment_id
        CROSS JOIN LATERAL regexp_split_to_table(s.text,'') AS chars(value)
        JOIN corpus.characters c ON c.value=chars.value
        GROUP BY s.id,c.id ORDER BY c.id,s.id ON CONFLICT DO NOTHING""")
    db.execute("""INSERT INTO corpus.character_occurrences(character_id,segment_occurrence_id,position_in_segment)
        SELECT c.id,b.id,(chars.ordinality-1)::integer FROM occurrence_batch b
        JOIN corpus.segments s ON s.id=b.segment_id
        CROSS JOIN LATERAL regexp_split_to_table(s.text,'') WITH ORDINALITY AS chars(value,ordinality)
        JOIN corpus.characters c ON c.value=chars.value""")
    db.execute(
        """INSERT INTO corpus.story_segment_stats(story_id,segment_id,occurrence_count)
        SELECT %s,segment_id,count(*) FROM occurrence_batch GROUP BY segment_id ORDER BY segment_id
        ON CONFLICT(story_id,segment_id) DO UPDATE SET occurrence_count=
        corpus.story_segment_stats.occurrence_count+excluded.occurrence_count""",
        (story["id"],),
    )
    db.execute(
        """INSERT INTO corpus.story_character_stats(story_id,character_id,occurrence_count)
        SELECT %s,sc.character_id,sum(sc.count_in_segment) FROM occurrence_batch b
        JOIN corpus.segment_characters sc ON sc.segment_id=b.segment_id GROUP BY sc.character_id ORDER BY sc.character_id
        ON CONFLICT(story_id,character_id) DO UPDATE SET occurrence_count=
        corpus.story_character_stats.occurrence_count+excluded.occurrence_count""",
        (story["id"],),
    )
    db.execute(
        """UPDATE corpus.stories SET byte_offset=%s,character_count=%s,fragment_count=%s,
        sentence_position=%s,part_position=%s,pending_boundary=%s WHERE id=%s""",
        (
            story["byte_offset"],
            story["character_count"],
            story["fragment_count"],
            story["sentence_position"],
            story["part_position"],
            story["pending_boundary"],
            story["id"],
        ),
    )
    db.execute(
        "UPDATE corpus.import_jobs SET updated_at=now() WHERE story_id=%s",
        (story["id"],),
    )
    db.commit()


def process(db, job):
    story = db.execute(
        "SELECT * FROM corpus.stories WHERE id=%s", (job["story_id"],)
    ).fetchone()
    if story["segmentation_version"] != fingerprint():
        raise ValueError("Worker segmentation version differs from the import version")
    upload = db.execute(
        "SELECT * FROM corpus.uploads WHERE id=%s", (story["upload_id"],)
    ).fetchone()
    path = path_for(story["upload_id"])
    if path.stat().st_size != upload["size"]:
        raise ValueError("Uploaded file size changed")
    if not story["checksum"]:
        digest = sha256()
        with path.open("rb") as source:
            while chunk := source.read(1024 * 1024):
                digest.update(chunk)
        db.execute(
            "UPDATE corpus.stories SET checksum=%s WHERE id=%s",
            (digest.hexdigest(), story["id"]),
        )
        db.commit()
    tokenizer = jieba.Tokenizer()
    tokenizer.initialize()
    with path.open("rb") as source:
        source.seek(story["byte_offset"])
        batch = []
        size = 0
        for fragment in fragments(source, initial_boundary=story["pending_boundary"]):
            batch.append(fragment)
            size += len(fragment.text)
            if size >= 32768:
                record_batch(db, story, batch, tokenizer)
                batch, size = [], 0
        if batch:
            record_batch(db, story, batch, tokenizer)
    if story["byte_offset"] != upload["size"]:
        raise ValueError("Import did not cover every source byte")
    publish(db, story["id"])
    db.execute(
        "UPDATE corpus.stories SET status='completed' WHERE id=%s", (story["id"],)
    )
    db.execute(
        "UPDATE corpus.import_jobs SET status='completed',error=NULL,updated_at=now() WHERE id=%s",
        (job["id"],),
    )
    db.commit()


def publish(db, story_id):
    # Only publication is serialized. This prevents two simultaneous imports
    # from counting the same newly visible segment twice globally.
    db.execute("SELECT pg_advisory_xact_lock(735981643)")
    db.execute(
        """CREATE TEMP TABLE new_segments ON COMMIT DROP AS
        SELECT ss.segment_id FROM corpus.story_segment_stats ss
        WHERE ss.story_id=%s AND NOT EXISTS
        (SELECT 1 FROM corpus.published_segments p WHERE p.segment_id=ss.segment_id)""",
        (story_id,),
    )
    db.execute(
        """UPDATE corpus.story_character_stats cs SET
        distinct_segment_count=q.diversity,segment_occurrence_count=q.occurrences
        FROM (SELECT sc.character_id,count(*) AS diversity,sum(ss.occurrence_count) AS occurrences
          FROM corpus.story_segment_stats ss JOIN corpus.segments s ON s.id=ss.segment_id AND s.is_word
          JOIN corpus.segment_characters sc ON sc.segment_id=ss.segment_id
          WHERE ss.story_id=%s GROUP BY sc.character_id) q
        WHERE cs.story_id=%s AND cs.character_id=q.character_id""",
        (story_id, story_id),
    )
    db.execute(
        """INSERT INTO corpus.character_stats
        SELECT cs.character_id,cs.occurrence_count,coalesce(n.diversity,0),cs.segment_occurrence_count
        FROM corpus.story_character_stats cs LEFT JOIN
        (SELECT sc.character_id,count(*) AS diversity FROM new_segments n
          JOIN corpus.segments s ON s.id=n.segment_id AND s.is_word
          JOIN corpus.segment_characters sc ON sc.segment_id=n.segment_id GROUP BY sc.character_id) n
        ON n.character_id=cs.character_id WHERE cs.story_id=%s
        ON CONFLICT(character_id) DO UPDATE SET
        occurrence_count=corpus.character_stats.occurrence_count+excluded.occurrence_count,
        distinct_segment_count=corpus.character_stats.distinct_segment_count+excluded.distinct_segment_count,
        segment_occurrence_count=corpus.character_stats.segment_occurrence_count+excluded.segment_occurrence_count""",
        (story_id,),
    )
    db.execute(
        "INSERT INTO corpus.published_segments SELECT segment_id FROM new_segments ON CONFLICT DO NOTHING"
    )


def run_once():
    with connect(worker=True) as db:
        # Session lock survives batch commits and is released automatically on a
        # process crash. Scanning candidates uses a server cursor, not fetchall.
        with db.cursor(name="pending_jobs", withhold=True) as candidates:
            candidates.execute(
                "SELECT * FROM corpus.import_jobs WHERE status IN ('queued','processing') ORDER BY updated_at,id"
            )
            db.commit()
            for job in candidates:
                key = str(job["id"])
                acquired = db.execute(
                    "SELECT pg_try_advisory_lock(hashtextextended(%s,0)) AS locked",
                    (key,),
                ).fetchone()["locked"]
                if not acquired:
                    continue
                try:
                    current = db.execute(
                        "SELECT status FROM corpus.import_jobs WHERE id=%s",
                        (job["id"],),
                    ).fetchone()
                    if current["status"] not in ("queued", "processing"):
                        continue
                    db.execute(
                        "UPDATE corpus.import_jobs SET status='processing',attempts=attempts+1,updated_at=now() WHERE id=%s",
                        (job["id"],),
                    )
                    db.execute(
                        "UPDATE corpus.stories SET status='processing' WHERE id=%s",
                        (job["story_id"],),
                    )
                    db.commit()
                    process(db, job)
                except Exception as error:
                    db.rollback()
                    logger.exception("Corpus import %s failed", key)
                    message = (
                        str(error)
                        if isinstance(error, (ValueError, UnicodeError))
                        else "Import failed; inspect worker logs and retry"
                    )
                    db.execute(
                        "UPDATE corpus.import_jobs SET status='failed',error=%s,updated_at=now() WHERE id=%s",
                        (message[:500], job["id"]),
                    )
                    db.execute(
                        "UPDATE corpus.stories SET status='failed' WHERE id=%s",
                        (job["story_id"],),
                    )
                    db.commit()
                finally:
                    db.execute(
                        "SELECT pg_advisory_unlock(hashtextextended(%s,0))", (key,)
                    )
                    db.commit()
                return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    migrate()
    while True:
        worked = run_once()
        if args.once:
            return
        if not worked:
            time.sleep(2)


if __name__ == "__main__":
    main()
