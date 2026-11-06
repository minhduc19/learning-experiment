# Proposed lesson storage

This records the original storage proposal. JSONB lesson saving, editing and
multiple-choice previews are now implemented; see `lessons.md`. Mixed-type
playback remains future work. The static quiz still accepts questions.js.

## Options

| Approach | Benefits | Cost |
| --- | --- | --- |
| JSON files | Simple imports/exports and Git review | Requires deployment or server file management; weaker concurrent editing |
| PostgreSQL JSONB (recommended initially) | Saves the ordered lesson atomically; flexible typed payloads; fits existing accounts/storage | Application validates each type; cross-lesson question searches are harder |
| Lessons + positioned item rows | Easier per-question querying, reuse and editing | More tables, transactions and ordering constraints |

Start with a user-owned lessons table containing id, user_id, title, schema_version,
revision, payload JSONB, created_at and updated_at. If item-level querying becomes
necessary, migrate to positioned rows while retaining JSONB for type-specific data.

## Ordered, typed payload

```json
{
  "schemaVersion": 1,
  "title": "Chinese vocabulary practice",
  "items": [
    {
      "id": "item-001",
      "type": "multiple-choice",
      "data": {
        "id": "xin_fangxin",
        "instruction": "Fill in the blank",
        "sentence": "大王[[blank]]。",
        "answer": "relax",
        "translation": "Your Majesty, rest assured.",
        "options": [
          {"id": "relax", "label": "放心", "fill": "放心", "feedback": "Correct: rest assured."},
          {"id": "heart", "label": "心中", "feedback": "This means in the heart/mind."}
        ]
      }
    }
  ]
}
```

The items array is the authoritative question order. Preserve it on save/load,
playback and restart. Never derive order from IDs, timestamps, object keys or
question type. Stable item IDs identify placements, allowing a reusable question
to appear twice with separate item IDs. Option shuffling, if added, must be a
separate explicit behavior and must not reorder lesson items.

Future item types can include reading, written-answer or listening with their own
data schemas. A renderer registry dispatches by type. Current multiple-choice
payloads can be imported unchanged inside data and handed to the existing quiz
through an adapter; a mixed lesson requires a lesson-level player rather than
passing unrelated types into useQuiz. Introduce each type with validation and a
renderer; reject unsupported types clearly instead of silently skipping them.

Suggested endpoints: POST /api/lessons, GET /api/lessons, GET /api/lessons/{id},
and PUT /api/lessons/{id}. Require ownership, validate item IDs/types/payloads,
and use revision checks to prevent concurrent edits overwriting one another.
Saved lesson edits should create revisions if playback history must retain the
original content. The schemaVersion describes payload format; revision describes
edits to one lesson. Reuse the project's JSON serialization for database storage.

The current tests validate multiple-choice data shape and ordered quiz behavior;
they do not certify linguistic correctness or implement future item types.
