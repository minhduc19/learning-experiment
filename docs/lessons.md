# Private JSONB lessons

Routes: `/lessons` lists the signed-in user's lessons; `/lessons/new` creates a
lesson; `/lessons/:lessonId` opens the JSON editor and interactive live preview.
The Ideas directory includes the named routes automatically. Paste a JSON lesson
object or a JSON array from questions.js, omitting the JavaScript export statement.
Arrays are wrapped into a titled lesson with stable placement IDs in their
original order. The editor displays validation errors, disables invalid saves,
and renders valid items using the shared activity components.
Editing JSON resets preview answers so the preview always reflects current data.

The canonical document has `schemaVersion: 1`, `title`, and an ordered `items`
array. Each item has a unique placement `id`, a supported activity `type`, and a
`data` object matching that type. Question IDs may repeat across separate
placements. Items never sort by ID or type. Future types need a validator and
preview renderer before being accepted; unsupported types are rejected explicitly.
See `lesson-storage-proposal.md` for the format example and design background.

Activity questions now use three shared prompt fields:

```json
{
  "text-prompt": "我[[blank]]中文。",
  "text-prompt-available": true,
  "audio-prompt": null
}
```

`text-prompt` replaces multiple choice's `sentence` and sentence jumble's `prompt`.
Multiple-choice text retains exactly one `[[blank]]`; jumble text can be null for
an ordering-only exercise. `text-prompt-available: false` keeps that text out of
the question UI and accessibility tree until Check, then reveals it during
feedback (including incorrect answers). Try again hides it again.

`audio-prompt` is an optional HTTP(S) URL. A speaker button appears when provided;
playback begins only on click, supports replay/stop, and stops on question changes
or when option audio starts. It is separate from generated option `audio_id`
recordings. Playback errors leave the quiz usable. The sample data uses the
supplied music track over HTTPS and labels it as demo music, not spoken question
content. The sample routes demonstrate combined, hidden-text/audio, text-only,
and no-prompt configurations.

Frontend loaders and backend validation accept legacy `sentence`/`prompt` fields
and default missing availability to true for text questions. New imports and saves
write canonical hyphenated keys; conflicting old/new values are rejected. Older
stored lessons and practice attempts continue to play without rewriting the
whole database. Reading checkpoints and new AI prompt examples use the same
fields. Existing saved system prompts remain unchanged and their legacy JSON
output is still accepted. No new database migration is required.

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

## Lesson practice points

Each multiple-choice question's data may include `"target-character": "心"` and
`"target-segment": "道心"`. These optional hyphenated keys contain corpus text,
not IDs. Existing lessons without targets still play and receive a score.
Targets resolve to the owner's completed corpus: exact original text takes
precedence, otherwise one unambiguous stored traditional/simplified match is
accepted. Missing or ambiguous matches are reported without awarding points.

Open a saved lesson and choose Play saved lesson (`/lessons/:lessonId/play`).
Questions play in placement order using the same full-screen activity as
`/multiple-choice`. Users can change selections before Check; wrong answers show
Try again and correct answers show Continue. Completion submits the successful
option ID for each item, including questions corrected after a retry. The server grades against
an immutable lesson snapshot taken at attempt start, so editing the saved lesson
cannot alter an in-progress attempt's answers or targets. Previewing in the
editor does not record practice.

POST `/api/lessons/{id}/attempts` starts an owned attempt. POST
`/api/lessons/attempts/{attemptId}/complete` accepts:

```json
{"answers": [{"item_id": "item-1", "option_id": "correct-option-id"}]}
```

Supply exactly one valid option per item. The server independently determines
correctness and increments each resolved target once per correct question in a
single transaction. Repeated targets on different correct questions earn separate
points. The attempt row is locked and its result persisted; duplicate/concurrent
completion requests return the same result without awarding again. A new attempt
can earn more points. No practice is awarded for unfinished lessons.

Completion returns correct/incorrect totals and deduplicated character/segment
summaries with IDs, Learned/Learning flags, total `practice` and this attempt's
`earned` points. Summaries reflect completion time. Targets are clickable;
`/segments/:segmentId` now shows segment details and sentences, linking back to
its characters. Character/segment corpus responses expose integer practice totals.

Migration `008_lesson_practice.sql` adds nonnegative bigint `practice` columns to
personal progress tables, not shared vocabulary definitions, and creates private
`corpus.lesson_attempts` snapshots/results. Marks and points remain independent;
changing Learned/Learning flags preserves points. Existing data starts at zero.
Normal deployment applies the migration without resetting any corpus data.

## Mixed activity lessons

`/sample-lesson` is a public four-activity example backed by
`apps/frontend/src/data/sampleLesson.json`. Each ordered item has one of these
`type` values and a `data` object matching the corresponding sample activity:

- `multiple-choice`: a question with options and an answer ID.
- `reading`: a reading document with sentence blocks and optional `Multiple-choice` checkpoints.
- `sentence-jumble`: prompt fields, tiles with stable IDs, and accepted arrays of tile IDs.
- `matching-pairs`: instructions, language labels, and 2–5 source/target pairs with unique IDs.

The lesson editor validates all four types and previews mixed lessons with the
same shared sequential player used by `/sample-lesson` and
`/lessons/:lessonId/play`. Sample activity routes continue to work independently.
Lesson titles in `/lessons` open playback; the separate Edit button opens the
existing JSON editor.

Each activity advances after successful completion. Reading requires its
checkpoints to be answered correctly, followed by Continue lesson; reading with
no checkpoints has a manual Continue lesson action. Existing multiple-choice
practice targets and idempotent practice scoring remain intact. Non-targeted
activities contribute to the lesson score without inventing corpus practice
targets.

The completion API accepts `{item_id, option_id}` for multiple choice and
`{item_id, answer}` for the other types. Answer objects contain `tile_ids`,
`pair_ids`, or a `checkpoints` mapping from reading block ID to option ID. The
backend grades against the immutable attempt snapshot, rejects unknown or
missing IDs, and does not trust a client-provided completed flag. Existing
multiple-choice-only lessons and their payloads remain compatible. No new
migration is required: lesson documents and attempts already use JSONB.

Character search at `/characters` matches original, simplified, and traditional
forms while preserving ownership, filters, ordering, and pagination.
