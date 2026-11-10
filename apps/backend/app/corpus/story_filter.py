"""SQL predicates for explicitly supplied story UUIDs; ownership checks remain required."""
from uuid import UUID
from psycopg import sql


def story_predicate(story_ids, column="d.id"):
    if not story_ids:
        return ""
    # Reparse identifiers and quote with psycopg; never interpolate request strings.
    identifiers = sorted({UUID(str(value)) for value in story_ids})
    values = ",".join(sql.Literal(value).as_string() for value in identifiers)
    return f" AND {column} IN ({values})"
