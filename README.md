# City Survey Node.js API

Express backend for the City Survey application. The active scope is user
authentication and user add/update through MySQL stored procedures.

## Active APIs

### Authenticate user

`POST /api/auth/api-post-authenticate-user`

Calls:

```sql
CALL USP_POST_USER_AUTHENTICATE_ACTIVITY('AUTHENTICATE_USER', '[{"USER_NAME":"sai@yopmail.com","PASSWORD":"Abc@1234"}]', @ERRNO, @ERRMSG);
```

Request body:

```json
[
  {
    "USER_NAME": "sai@yopmail.com",
    "PASSWORD": "Abc@1234"
  }
]
```

The API also accepts a single object body with the same fields.

### Add or update user

`POST /api/user/api-post-add-update-user`

Requires `Authorization: Bearer <token>`.

Calls:

```sql
CALL USP_POST_USER_PROFILE_ACTIVITY('ADD_UPDATE_USER', '[{"ITEM":"ADD_USER","USER_SYS_ID":0,"SYSTEM_ROLE_SYS_ID":1,"FIRST_NAME":"Sai","LAST_NAME":"Roy","GENDER":"Male","MOBILE_NO":"7894561230","EMAIL_ID":"sai@yopmail.com","ORGANISATION_SYS_ID":"1","PASSWORD":"Abc@1234","CREATED_BY":"1"}]', @ERRNO, @ERRMSG);
```

Request body:

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

The route accepts the object above and wraps it as a one-item JSON array before
calling the stored procedure because the current database procedure extracts
fields using `$[0]`.

## Setup

```bash
npm install
npm run dev
```

For a normal non-watch run:

```bash
npm start
```

Required `.env` keys:

```env
PORT=3103
DB_HOST=
DB_USER=
DB_PASS=
DB_NAME=DEV_CITY_SURVEY
JWT_SECRET=
```

Use `.env.example` as the template and keep real credentials only in `.env`.

Swagger runs at `http://localhost:3103/api/api-docs` when using the local
`.env` port. Swagger uses the current browser host, so API calls stay on the
same port where the docs are opened.

If the terminal shows `EADDRINUSE`, another process is already using the
configured port. Stop that process or update `PORT` in `.env`.

## Project Handoff Docs

Detailed backend and UI handoff documentation is available in `docs/`:

- [Documentation Index](./docs/INDEX.md)
- [Module Architecture and Scenario Flow](./docs/MODULE_ARCHITECTURE_FLOW.md)
- [Browser Demo and Demo Flow](./docs/BROWSER_DEMO_AND_DEMO_FLOW.md)
- [Dev Server Deployment Checklist](./docs/DEV_SERVER_DEPLOYMENT_CHECKLIST.md)
- [Run and Test Guide](./docs/RUN_AND_TEST_GUIDE.md)
- [Work Report and Backend Handoff KT](./docs/WORK_REPORT_AND_HANDOFF_KT_2026-07-08.md)
- [UI Developer Handoff KT](./docs/UI_DEVELOPER_HANDOFF_KT.md)
