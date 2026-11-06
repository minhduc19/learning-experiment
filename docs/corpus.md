# Chinese corpus API

The corpus API stores UTF-8 `.txt` stories in PostgreSQL, including every character
occurrence, Jieba segment occurrence, sentence, and source position. It is separate
from `/api/readings`: this change does not replace reading JSON or generate
translations, quiz blocks, or pinyin. Interactive documentation is available on
`/api-docs` and `/api/docs`, including these routes automatically.

## Personal character learning marks

In `/characters`, each card has independent **Learned** and **Learning** toggle
buttons. One click selects a mark; clicking it again removes it. Select both to
mark a character for revision. Marks are saved automatically for the signed-in
user, across all their stories, and remain selected after a reload.

`PATCH /api/corpus/characters/{character_id}/progress` accepts either or both
boolean fields, for example:

```json
{"learned": true, "learning": true}
```

Omitted fields retain their existing values. `false` removes a mark. The endpoint
returns `{character_id, learned, learning}` and rejects empty updates, nulls,
non-boolean values, and unknown fields. It requires a bearer token and returns
404 when the character is absent from the user's completed corpus. Character
list and detail responses include `learned` and `learning`, both false initially.

Migration `004_character_progress.sql` stores these flags in
`corpus.user_character_progress`, keyed by `(user_id, character_id)`. Shared
character definitions and corpus counts are unchanged. Atomic partial updates
preserve independent flags even when both requests arrive together. Saved marks
are private to each user, including when another user has the same character.

## Start services

```sh
docker compose up --build -d --wait
docker compose logs -f corpus-worker
```

Compose runs versioned transactional SQL migrations before starting the API and
worker. Both share the durable `corpus_data` volume; database tables remain in
`postgres_data`. Ordinary restarts and redeployments preserve both. Do not use
`docker compose down --volumes` unless you intend to delete stored data.

For a locally running backend, export the database variables from your local
`.env`, then run these commands from `apps/backend`:

```sh
uv run python -m app.corpus.migrate
uv run python -m app.corpus.worker
```

The API does not run migrations during requests. The short database health check
keeps its original timeout; corpus queries have a 30-second timeout and worker
statements can run longer. The backend and worker use the same locked Jieba
version and packaged dictionary fingerprint. A worker refuses to resume an import
created with a different segmentation configuration.

## Upload a story

From the repository root, using Python 3:

```sh
python apps/backend/scripts/import_corpus.py story.txt --title '我的故事'
```

For the Docker frontend URL, add `--api http://localhost:8080`. If interrupted,
rerun with the same file and `--upload-id` printed by the first run. Upload bytes
must come from the same unchanged file. The script prints the import ID and
progress URL when the upload is queued; processing continues in the worker.

The project-specific resumable protocol is:

1. `GET /api/corpus/limits` returns file/chunk byte limits.
2. `POST /api/corpus/uploads` with `{"filename":"story.txt","size":12345}` creates
   an upload and returns its `id` and `offset_bytes`.
3. `PATCH /api/corpus/uploads/{id}` appends raw bytes with
   `Content-Type: application/octet-stream` and `Upload-Offset: <current offset>`.
   Successful responses are 204 with the new `Upload-Offset` header.
4. `GET` or `HEAD /api/corpus/uploads/{id}` retrieves the committed offset to
   resume after interruption. Conflicting offsets return 409. A file becomes
   immutable when queued.
5. `POST /api/corpus/imports` with `{"upload_id":"...","title":"我的故事"}` returns
   202 with `id` (job ID), `story_id`, and `status`. Repeating this request for the
   same upload returns the same job. A separate upload intentionally creates a
   separate story, even if its checksum matches an existing story.
6. `GET /api/corpus/imports/{id}` reports status, processed byte offset, counts,
   progress, source SHA-256, dictionary version, and a safe error when applicable.
   `POST /api/corpus/imports/{id}/retry` resumes a failed job at its last committed
   checkpoint. Invalid source files need a new upload, rather than repeated retries.

The default maximum file size is **1 GiB**, configurable with
`CORPUS_MAX_UPLOAD_BYTES`. Each request carries at most **8 MiB**. Nginx permits
these chunks and disables request buffering for the upload route. The worker
reads incrementally and bulk-loads batches of approximately 32,768 characters,
without holding an entire story in RAM. Jieba also needs memory for its dictionary.

The configured file limit is not a guarantee of available capacity. Per-character
rows and indexes can require much more storage than the source file. Check free
space for uploads, database data, temporary space, and WAL before raising the
limit. These endpoints inherit the project's existing access model; deploy them
behind your existing access controls when uploads should be private.

## Query endpoints

| Endpoint | Result |
| --- | --- |
| `GET /api/corpus/stories` | Completed stories; paginate with `after` and `next_after` |
| `GET /api/corpus/characters` | Characters ranked by `occurrence_count` descending |
| `GET /api/corpus/characters?sort=distinct_segment_count` | Characters ranked by distinct word membership |
| `GET /api/corpus/characters?character=学` | Look up a character and its ID |
| `GET /api/corpus/characters/{id}` | Character statistics and distinct logical sentence count |
| `GET /api/corpus/characters/{id}/segments` | Distinct word segments containing that character |
| `GET /api/corpus/segments/{id}/sentences` | Distinct sentence fragments containing that segment |
| `GET /api/corpus/characters/{id}/sentences` | Distinct sentence fragments containing that character |
| `GET /api/corpus/stories/{id}/sentences` | Sentence fragments in original order |
| `GET /api/corpus/stories/{id}/text` | UTF-8 text streamed from the ordered database rows |

Lists have a default `limit=50`, maximum 100. Except the stories directory,
pagination returns `items` and `next_cursor`; pass that value as `cursor` with the
same filters. Character, segment, and matching-sentence queries accept `story_id`
for a single completed story. Across stories, sentences sort by story ID, then
source position. Ranking pages are consistent while the corpus is unchanged;
restart pagination when a newly published story changes counts.

Statistics include only completed imports. Character listings default to Han
characters; use `include_non_han=true` for punctuation, whitespace, emoji, and
other characters. Segment listings default to tokens containing an alphanumeric
character; use `include_non_words=true` to include punctuation and whitespace.

For ten occurrences of `谢谢`, character `谢` has `occurrence_count=20`,
`distinct_segment_count=1`, and `segment_occurrence_count=10`. Distinct segment
counts across stories count the union of segment texts, not the sum of each
story's distinct counts. Cached counts publish atomically with a completed story.

## Exact reconstruction and sentence fragments

Sentence framing recognizes `。！？!?` and line endings, retaining trailing
punctuation, closing quotes, and whitespace. It is a deterministic framing rule,
not a linguistic parser; abbreviations and dialogue may need a richer parser in
a future version. ASCII periods do not currently terminate sentences.

Each returned sentence row contains:

- `position`: zero-based source order across all fragments in the story.
- `sentence_position`: logical sentence order.
- `part_position`: zero-based part within that logical sentence.
- `is_final`: whether this is the sentence's last fragment.
- `raw_text`: exact source text, including whitespace and line endings.
- `start_offset` / `end_offset`: absolute Unicode code-point positions, end-exclusive.
- `matches`: matching ranges relative to `raw_text` on concordance queries.

Logical sentences exceeding 4,096 code points use consecutive fragments. This
bounds memory even for an entire file without punctuation. Concordance APIs
return matching fragments, identified by logical sentence/part; use the story's
ordered sentence endpoint to retrieve surrounding or remaining parts. Segmentation
runs independently within these exceptional fragments; a token crossing a
fragment boundary is split. Individual tokens longer than 256 code points are
also split to keep dictionary indexes bounded.

Concatenating `raw_text` in ascending `position` reproduces the original text;
`/text` does this with a server-side database cursor. No trimming, Unicode
normalization, traditional/simplified conversion, or newline conversion occurs.
A UTF-8 BOM is preserved. Invalid UTF-8 or NUL characters fail the import without
publishing partial results. PostgreSQL text cannot store NUL characters.

Offsets count Unicode code points, not UTF-8 bytes or JavaScript UTF-16 units.
Upload/progress offsets count bytes. Character occurrences include every code
point, including repeated letters within one segment.

## Recovery and verification

A worker holds a PostgreSQL session advisory lock for its job. The lock is
released on process death; another worker can reclaim the processing job. Data,
statistics, and the byte checkpoint commit in the same batch transaction, so
retries cannot double-count a committed batch. Multiple workers can import
independent stories concurrently. A worker heartbeat health check supports
Compose's `--wait`; it refreshes while idle and after each committed batch.
SIGTERM requests shutdown after a batch checkpoint. Batch dictionary inserts use deterministic
ordering to reduce deadlocks; a failed batch can be retried.

`TEST_DATABASE_URL` enables PostgreSQL integration tests. The test role needs
permission to create a temporary database; tests remove that database afterward.
Tests cover reconstruction, UTF-8 chunk boundaries, counts and joins, incomplete
visibility, checkpoint recovery, long fragments, upload offsets, and pagination.
Full-size capacity testing remains deployment-specific; do not treat the default
upload limit as a benchmark result.

A development smoke test imported a 2,560,000-byte UTF-8 file containing 960,000
code points and 160,000 sentence rows. Streaming reconstruction matched the
original SHA-256. The test database occupied approximately 253 MiB, excluding
additional transient WAL and upload storage. This illustrates storage overhead;
it is not a production capacity or speed guarantee.

## Frontend explorer and sentence counts

Visit `/characters` to browse frequency rankings and `/characters/{id}` to explore
a character's associations. The Ideas directory links to the explorer. Selecting
a segment filters the sentence list, with per-excerpt match counts and Unicode
code-point highlighting. All three lists use cursor pagination.

`GET /api/corpus/characters/{id}` returns the character statistics plus
`sentence_count`, optionally scoped with `story_id`. The segment-list endpoint
accepts `include_sentence_counts=true` to add each segment's `sentence_count`
without making every existing segment-list request perform that aggregation.
Sentence counts count distinct `(story_id, sentence_position)` pairs: repeated
matches or multiple continuation fragments do not inflate a logical sentence's
count. Counts include only completed stories. Sentence results also include
`story_title` for identifying their source.

## Browser uploads

The Vue route `/corpus-upload` provides a file picker, optional title, upload and
processing progress, pause/resume controls, and links to the character explorer.
It uses the same upload/import protocol as the Python script. Native Blob slices
and XMLHttpRequest keep each request bounded to the smaller of the server chunk
limit and 8 MiB, with live upload progress. Text is not loaded into memory as a
single string.

The browser stores one pending/recent upload's IDs and file metadata locally.
Resuming after a reload requires reselecting the same unchanged file; its name,
size, and modification timestamp must match. The server's committed byte offset
is retrieved before resuming, including after an interrupted acknowledgement.
This metadata check is not a full-file content checksum. Browser storage may be
disabled; uploads still work in the current page, and import status URLs remain
usable after queueing.

Once an import is queued, the page URL includes `?import=<job-id>` and can be
bookmarked to check background progress later. Leaving the page stops browser
requests, not the server job. Starting a different upload clears the browser's
saved resume metadata; it does not delete uploaded server files or cancel a job.

## Traditional and simplified script forms

Corpus imports use OpenCC (`opencc-python-reimplemented`, `s2t` and `t2s`) to
persist both script variants alongside the exact original source:

| Resource | Original field | Traditional field | Simplified field |
| --- | --- | --- | --- |
| Character | `value` | `traditional_value` | `simplified_value` |
| Segment | `text` | `traditional_text` | `simplified_text` |
| Sentence fragment | `raw_text` | `traditional_text` | `simplified_text` |

These fields are returned by the existing character, character-detail,
segment-list, and sentence-list APIs. For example, a source character `學` keeps
`value: "學"`, with `traditional_value: "學"` and `simplified_value: "学"`.
Simplified or mixed-script input also receives both variants. The generated
traditional form is OpenCC's canonical conversion, not a claim about an author's
original traditional spelling; ambiguities such as `发` cannot be reversed
uniquely. The original fields preserve what was actually uploaded.

Character and segment variants are converted independently from their original
text. Each sentence is converted as a whole stored fragment, rather than by
concatenating character variants, so OpenCC can apply phrase context (`乾坤`, for
example). As with segmentation, exceptionally long sentences are converted per
ordered fragment. Character-level, segment-level, and sentence-level variants
can therefore differ where context matters. This is script conversion, not
translation into another language.

IDs, occurrence relationships, sentence order, statistics, search matching, and
highlight offsets continue to refer to the original source. Traditional and
simplified source characters remain separate dictionary entries even when their
simplified variants coincide. Variant strings are additional data; do not apply
source offsets to them without checking alignment.

`GET /api/corpus/stories/{id}/text` still reconstructs the exact original UTF-8
text and source SHA-256. Add `?script=traditional` or `?script=simplified` to stream
the corresponding stored variants in source order. Import status and story
summaries expose `conversion_version`, identifying the OpenCC package/configuration.

Migration `002_script_forms.sql` adds columns without converting the corpus in a
single deployment transaction. New rows receive both variants during their
normal import batch. The existing corpus worker fills legacy rows in small,
transactional batches with a durable progress record in
`corpus.script_backfill_progress`; interrupted work resumes automatically. API
reads supply missing forms while backfill is running. Older dictionary rows
reused by a new import are repaired within that import batch too. Original values and counts
are never rewritten by conversion.

To run or finish backfill explicitly, export the normal database configuration
and run from `apps/backend`:

```sh
uv run python -m app.corpus.backfill
```

The command shares the worker's backfill lock and waits if another worker is
already converting. Script conversion versions are checked on resumable imports
and backfill; changing the conversion configuration requires an explicit data
migration. Keeping the original and both variants requires additional storage.

## Authentication and ownership

All `/api/corpus` endpoints now require an account access token. The browser
uploader and explorer handle authentication automatically; the Python upload
script prompts for your login. Story lists, character statistics, segment
associations, and sentence/export results include only the current user's data.
See [authentication.md](authentication.md) for endpoints, HTTPS configuration,
and assigning existing anonymous records. Shared vocabulary definitions do not
grant access to another user's sentences or counts.
