# Work Report and Backend Handoff KT

Date: 2026-07-08

## Work Completed Today

Implemented and verified the current City Survey backend API scope in the
existing Node.js application.

Completed items:

- Integrated `DEV_CITY_SURVEY` RDS database credentials through `.env`.
- Kept database config source-driven by environment variables in `config/db.js`.
- Implemented active authenticate API:
  - `POST /api/auth/api-post-authenticate-user`
  - Procedure: `USP_POST_USER_AUTHENTICATE_ACTIVITY`
- Implemented active add/update user API:
  - `POST /api/user/api-post-add-update-user`
  - Procedure: `USP_POST_USER_PROFILE_ACTIVITY`
- Added JWT generation for successful authentication.
- Added JWT protection for add/update user.
- Added response helper for stored procedure `JSON_VALUE` parsing.
- Disabled active mounting of old event, attendee, payment, file upload, and
  email APIs from `index.js`.
- Limited Swagger generation to the active City Survey route files.
- Updated Swagger server URL to relative `/` so Swagger calls the current
  running port instead of any hardcoded localhost port.
- Added startup handling for `EADDRINUSE` port conflicts.
- Updated README and added this documentation pack.

## Important Technical Finding

The database developer's sample for `USP_POST_USER_PROFILE_ACTIVITY` showed a
plain JSON object, but the live stored procedure reads fields using `$[0]`.

Backend decision:

- Frontend can send a normal object.
- Backend wraps the object as a one-item array before calling the stored
  procedure.

Implemented in:

- `routes/user.js`

## Files Changed or Added

Backend files:

- `config/db.js`
- `index.js`
- `middlewares/auth.js`
- `routes/auth.js`
- `routes/user.js`
- `utils/procedureResponse.js`
- `docs/swagger.js`
- `config/test.js`

Documentation files:

- `README.md`
- `docs/INDEX.md`
- `docs/MODULE_ARCHITECTURE_FLOW.md`
- `docs/BROWSER_DEMO_AND_DEMO_FLOW.md`
- `docs/DEV_SERVER_DEPLOYMENT_CHECKLIST.md`
- `docs/RUN_AND_TEST_GUIDE.md`
- `docs/WORK_REPORT_AND_HANDOFF_KT_2026-07-08.md`
- `docs/UI_DEVELOPER_HANDOFF_KT.md`

## Verification Done

Syntax checks:

- `node --check index.js`
- `node --check routes/auth.js`
- `node --check routes/user.js`
- `node --check middlewares/auth.js`
- `node --check utils/procedureResponse.js`
- `node --check docs/swagger.js`

Database checks:

- Connected to `DEV_CITY_SURVEY`
- Confirmed procedure exists:
  - `USP_POST_USER_AUTHENTICATE_ACTIVITY`
  - `USP_POST_USER_PROFILE_ACTIVITY`
- Auth procedure returned `status: true` for sample user.

HTTP API smoke test:

- Started local server on configured local port `3103`
- Auth API returned HTTP 200 and token
- Protected add/update API accepted token
- Existing sample email returned `This Email Id Already Exists`
- Sample email count stayed `1 -> 1`, so no duplicate test user was created

## Current Working API Contracts

### Authenticate User

Endpoint:

`POST /api/auth/api-post-authenticate-user`

Request:

```json
[
  {
    "USER_NAME": "sai@yopmail.com",
    "PASSWORD": "Abc@1234"
  }
]
```

Response:

- Returns DB user data
- Returns `Token` when `status` is `true`

### Add or Update User

Endpoint:

`POST /api/user/api-post-add-update-user`

Header:

```text
Authorization: Bearer <Token>
```

Request:

```json
{
  "ITEM": "ADD_USER",
  "USER_SYS_ID": 0,
  "SYSTEM_ROLE_SYS_ID": 1,
  "FIRST_NAME": "Sai",
  "LAST_NAME": "Roy",
  "GENDER": "Male",
  "MOBILE_NO": "7894561230",
  "EMAIL_ID": "sai@yopmail.com",
  "ORGANISATION_SYS_ID": "1",
  "PASSWORD": "Abc@1234",
  "CREATED_BY": "1"
}
```

## Handoff KT for Backend Developer

Walkthrough order:

1. Start at `index.js`.
2. Show only `authRoutes` and `userRoutes` are mounted.
3. Show `config/db.js` reads all DB config from `.env`.
4. Show `routes/auth.js`:
   - normalizes auth payload
   - calls auth procedure
   - parses `JSON_VALUE`
   - signs JWT
5. Show `middlewares/auth.js`:
   - expects `Authorization: Bearer <token>`
   - returns 401 for missing token
   - returns 403 for invalid token
6. Show `routes/user.js`:
   - requires JWT middleware
   - validates `ITEM`
   - wraps payload into array for DB
   - calls user profile procedure
7. Show `utils/procedureResponse.js`:
   - parses procedure response safely
8. Show Swagger at `/api/api-docs`.
9. Run auth and add/update demo.

## Handoff KT for Database Developer

Confirmed:

- Backend connects to `DEV_CITY_SURVEY`.
- Backend calls stored procedures using parameterized `conn.execute`.
- Backend uses operation names exactly as provided:
  - `AUTHENTICATE_USER`
  - `ADD_UPDATE_USER`

DB follow-up points:

- Confirm final JSON shape for `USP_POST_USER_PROFILE_ACTIVITY`. Current live
  procedure uses `$[0]`, so backend sends array shape to DB.
- Confirm update-user payload fields for `ITEM: UPDATE_USER`.
- Confirm whether password should be mandatory for update.
- Confirm whether future read/list user APIs will be provided.
- Confirm standard response shape for success and failure across procedures.

## Known Notes and Risks

- Port `3000` was already occupied locally during verification, so temporary
  testing was moved to local port `3103`.
- The stored procedure commits internally, so write tests create real dev DB
  records.
- There is no dedicated health API yet.
- There are no automated unit/integration test files yet.
- Legacy route files still exist in the repo, but they are not mounted.

## Recommended Next Backend Tasks

- Add a non-DB `GET /api/health` endpoint for deployment checks.
- Add automated integration test script under a `tests` or `scripts` folder.
- Confirm update-user and delete-user DB contracts.
- Remove or archive legacy route files after senior developer approval.
- Keep `.env.example` updated and ensure `.env` stays ignored before pushing to
  remote.
