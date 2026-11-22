# Tasks API contract

This is the contract between the Tasks API and the Tasks web app. It is the source of truth: the Pydantic models in `app/models.py` and the web app's TypeScript types both follow it, field for field.

- Base URL in development: `http://localhost:8000`.
- Bodies are JSON (`Content-Type: application/json`).
- CORS allows the origin `http://localhost:3000`, the web app's development address, and no other.
- There is no sign-in.

## Current status

| Endpoint | Status |
|---|---|
| `GET /health` | Built |
| `GET /tasks`, `POST /tasks` | Answers `501 {"detail": "Not implemented"}` until its issue lands |
| `GET /tasks/summary` | Answers `501 {"detail": "Not implemented"}` until its issue lands |
| `GET /tasks/{id}`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}` | Answers `501 {"detail": "Not implemented"}` until its issue lands |

A stub still validates its input first, so an invalid body or a non-UUID `id` gets a 422 even before the endpoint is built.

## Task fields

| Field | Type | Rules |
|---|---|---|
| `id` | UUID string | Made by the API. The client never sends it. |
| `title` | string | Required. Trimmed of leading and trailing whitespace, then 1 to 200 characters. A title that is empty after trimming is a 422. In a PATCH it may be left out but not sent as `null`. |
| `notes` | string | Up to 2,000 characters. Not trimmed. Defaults to `""`. Never `null`: in a PATCH it may be left out but not sent as `null`. |
| `due` | `YYYY-MM-DD` date, or `null` | Optional. Defaults to `null`. In a PATCH, `null` clears the date. It is the only field a PATCH may set to `null`. |
| `done` | boolean | `false` when the task is created. In a PATCH it may be left out but not sent as `null`. |
| `created_at` | UTC date-time | Set by the API when the task is created. Read-only. |
| `done_at` | UTC date-time, or `null` | Set by the API when `done` becomes `true`; cleared to `null` when `done` becomes `false`; unchanged when a PATCH sends `done` with its current value. Read-only. |

**Date-times.** `created_at` and `done_at` are always sent as ISO 8601 UTC with exactly six fractional digits and a `Z` suffix, for example `2026-11-22T09:30:00.123456Z`. The format is fixed even when the microseconds are zero: `2026-11-22T09:30:00.000000Z`.

**Read-only fields.** A request that sends `id`, `created_at`, `done_at`, or any field not listed for it, is a 422.

## Errors

Every error body has a `detail` member.

| Status | When | Body |
|---|---|---|
| 404 | The task `id` is unknown | `{"detail": "Task not found"}` |
| 422 | The request is invalid: a bad body, query or path parameter | FastAPI's validation body: `detail` is a list of error objects, each with `loc`, `msg` and `type` |
| 501 | The endpoint is not built yet | `{"detail": "Not implemented"}` |

```json
{"detail": [{"type": "string_too_short", "loc": ["body", "title"], "msg": "String should have at least 1 character", "input": "", "ctx": {"min_length": 1}}]}
```

## Types

Pydantic (`app/models.py`) on the left, TypeScript on the right.

<table>
<tr><th>Pydantic</th><th>TypeScript</th></tr>
<tr><td>

```python
TitleStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
NotesStr = Annotated[str, StringConstraints(max_length=2000)]
UtcDateTime = Annotated[AwareDatetime, ...]
# sent as "2026-11-22T09:30:00.123456Z"

class Task(BaseModel):
    id: UUID
    title: str
    notes: str
    due: date | None
    done: bool
    created_at: UtcDateTime
    done_at: UtcDateTime | None
```

</td><td>

```ts
type Task = {
  id: string;              // UUID
  title: string;
  notes: string;
  due: string | null;      // "YYYY-MM-DD"
  done: boolean;
  created_at: string;      // "2026-11-22T09:30:00.123456Z"
  done_at: string | null;  // same format
};
```

</td></tr>
<tr><td>

```python
class TaskCreate(BaseModel):  # extra="forbid"
    title: TitleStr
    notes: NotesStr = ""
    due: date | None = None
```

</td><td>

```ts
type TaskCreate = {
  title: string;
  notes?: string;
  due?: string | null;
};
```

</td></tr>
<tr><td>

```python
class TaskUpdate(BaseModel):  # extra="forbid"
    # absent: unchanged; null: 422
    title: TitleStr = Field(default=None)
    notes: NotesStr = Field(default=None)
    # absent: unchanged; null: cleared
    due: date | None = None
    # absent: unchanged; null: 422
    done: bool = Field(default=None)
```

</td><td>

```ts
type TaskUpdate = {
  title?: string;        // null is a 422
  notes?: string;        // null is a 422
  due?: string | null;   // null clears the date
  done?: boolean;        // null is a 422
};
```

</td></tr>
<tr><td>

```python
class TaskStatus(StrEnum):
    all = "all"
    open = "open"
    done = "done"
```

</td><td>

```ts
type TaskStatus = "all" | "open" | "done";
```

</td></tr>
<tr><td>

```python
class Summary(BaseModel):
    total: int
    open: int
    done: int
```

</td><td>

```ts
type Summary = {
  total: number;
  open: number;
  done: number;
};
```

</td></tr>
<tr><td>

```python
class Health(BaseModel):
    status: Literal["ok"]
```

</td><td>

```ts
type Health = { status: "ok" };
```

</td></tr>
<tr><td>

```python
# HTTPException(status_code, detail)
# body: {"detail": "..."}
```

</td><td>

```ts
type ErrorBody = { detail: string };   // 404, 501
type ValidationErrorBody = {           // 422
  detail: { loc: (string | number)[]; msg: string; type: string }[];
};
```

</td></tr>
</table>

## Endpoints

| Method | Path | Request | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | none | 200 `Health` | none |
| GET | `/tasks?status=all\|open\|done` | query `status`, default `all` | 200 `Task[]`, newest first | 422 |
| POST | `/tasks` | body `TaskCreate` | 201 `Task` | 422 |
| GET | `/tasks/summary` | none | 200 `Summary` | none |
| GET | `/tasks/{id}` | path `id` (UUID) | 200 `Task` | 404, 422 |
| PATCH | `/tasks/{id}` | path `id` (UUID), body `TaskUpdate` | 200 `Task` | 404, 422 |
| DELETE | `/tasks/{id}` | path `id` (UUID) | 204, no body | 404, 422 |

`/tasks/summary` is routed before `/tasks/{id}`, and `id` must be a UUID, so `summary` is never read as an id.

### GET /health

Whether the API is up.

- Request: none.
- Response: `200 Health`.

```json
{"status": "ok"}
```

- Errors: none.

### GET /tasks

The tasks, newest first: by `created_at` descending, ties broken by the order they were created in (latest first).

- Request: query `status` (`TaskStatus`), optional, default `all`. `open` gives the tasks with `done: false`; `done` gives those with `done: true`.
- Response: `200 Task[]`.

```json
[
  {
    "id": "0b6a2a52-3c55-4f0e-9a0d-1f2a3b4c5d6e",
    "title": "Buy milk",
    "notes": "",
    "due": "2026-11-23",
    "done": true,
    "created_at": "2026-11-22T09:30:00.123456Z",
    "done_at": "2026-11-22T10:05:12.654321Z"
  },
  {
    "id": "6f1c9d3e-8b2a-4c7d-9e0f-a1b2c3d4e5f6",
    "title": "Write the report",
    "notes": "Section 3 first",
    "due": null,
    "done": false,
    "created_at": "2026-11-22T08:00:00.000000Z",
    "done_at": null
  }
]
```

- Errors: 422 when `status` is not `all`, `open` or `done`.

### POST /tasks

Creates a task. The API makes its `id` and `created_at`; `done` is `false` and `done_at` is `null`.

- Request: body `TaskCreate`.

```json
{"title": "  Buy milk  ", "due": "2026-11-23"}
```

- Response: `201 Task`.

```json
{
  "id": "0b6a2a52-3c55-4f0e-9a0d-1f2a3b4c5d6e",
  "title": "Buy milk",
  "notes": "",
  "due": "2026-11-23",
  "done": false,
  "created_at": "2026-11-22T09:30:00.123456Z",
  "done_at": null
}
```

- Errors: 422 when `title` is missing or empty after trimming or longer than 200 characters, `notes` is longer than 2,000 characters, `due` is not a `YYYY-MM-DD` date, or the body has any other field.

### GET /tasks/summary

Counts of the tasks.

- Request: none.
- Response: `200 Summary`. `total` is `open + done`.

```json
{"total": 2, "open": 1, "done": 1}
```

- Errors: none.

### GET /tasks/{id}

One task.

- Request: path `id`, a UUID.
- Response: `200 Task`, as in `POST /tasks`.
- Errors: 404 `{"detail": "Task not found"}` when no task has that id; 422 when `id` is not a UUID.

### PATCH /tasks/{id}

Changes the fields sent and leaves the others as they are. An empty body `{}` is valid and changes nothing.

- Request: path `id`, a UUID; body `TaskUpdate`.

```json
{"done": true, "due": null}
```

- Response: `200 Task`, the task after the change.

```json
{
  "id": "0b6a2a52-3c55-4f0e-9a0d-1f2a3b4c5d6e",
  "title": "Buy milk",
  "notes": "",
  "due": null,
  "done": true,
  "created_at": "2026-11-22T09:30:00.123456Z",
  "done_at": "2026-11-22T10:05:12.654321Z"
}
```

- Rules: `done` false to true sets `done_at` to now; true to false sets it to `null`; sending the current value leaves `done_at` as it is. `due: null` clears the date.
- Errors: 404 `{"detail": "Task not found"}` when no task has that id; 422 when `id` is not a UUID, a field breaks its rule, `title`, `notes` or `done` is `null`, or the body has any other field (including `id`, `created_at` and `done_at`).

### DELETE /tasks/{id}

Deletes a task.

- Request: path `id`, a UUID.
- Response: `204`, no body.
- Errors: 404 `{"detail": "Task not found"}` when no task has that id; 422 when `id` is not a UUID.
