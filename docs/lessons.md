# Private JSONB lessons

Routes: `/lessons` lists the signed-in user's lessons; `/lessons/new` creates a
lesson; `/lessons/:lessonId` opens the JSON editor and interactive live preview.
The Ideas directory includes the named routes automatically. Paste a JSON lesson
object or a JSON array from questions.js, omitting the JavaScript export statement.
Arrays are wrapped into a titled lesson with stable placement IDs in their
original order. The editor displays validation errors, disables invalid saves,
and renders valid items immediately using the actual multiple-choice activity.
Editing JSON resets preview answers so the preview always reflects current data.

The canonical document has `schemaVersion: 1`, `title`, and an ordered `items`
array. Each item has a unique placement `id`, `type: "multiple-choice"`, and `data`
containing the existing question fields. Question IDs may repeat across separate
placements. Items never sort by ID or type. Future types need a validator and
preview renderer before being accepted; unsupported types are rejected explicitly.
See `lesson-storage-proposal.md` for the format example and design background.

Authenticated endpoints:

- POST `/api/lessons`: create from the canonical document.
- GET `/api/lessons`: list metadata, 50 at a time; `offset` and returned `next`
  provide access to further lessons.
- GET `/api/lessons/{id}`: fetch document and revision.
- PUT `/api/lessons/{id}`: submit `{revision, document}`.
- DELETE `/api/lessons/{id}?revision=N`: delete the owned lesson.

JSONB preserves the items array order. Migration `007_lessons.sql` adds
`corpus.lessons` with owner, title, document, revision and timestamps. Deployment
runs it automatically; existing data is preserved. The initial revision is 1;
updates increment it under a row lock. Stale updates/deletes return 409, foreign
IDs return 404, and missing authentication returns 401. Validation rejects unknown
fields, unsupported versions/types, duplicate placement/option IDs, missing answer
references, invalid blank markers and invalid question shapes. Requests are capped
at 1 MiB, lessons at 200 items, and questions at 2–20 options.

The editor retains unsaved JSON when a save fails, supports reloading the saved
version after confirmation, warns before abandoning edits, and asks for explicit
confirmation before deleting a lesson. No learner progress or lesson-attempt
history is stored in this first version. Lesson editing does not alter the static
question bank or existing quiz routes.
