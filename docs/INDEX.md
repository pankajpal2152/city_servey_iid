# City Survey Documentation Pack

Date: 2026-07-08

This folder contains the backend handoff documentation for the current City
Survey Node.js API scope.

## Documents

- [Module Architecture and Scenario Flow](./MODULE_ARCHITECTURE_FLOW.md)
- [Browser Demo and Demo Flow](./BROWSER_DEMO_AND_DEMO_FLOW.md)
- [Dev Server Deployment Checklist](./DEV_SERVER_DEPLOYMENT_CHECKLIST.md)
- [Run and Test Guide](./RUN_AND_TEST_GUIDE.md)
- [Work Report and Backend Handoff KT](./WORK_REPORT_AND_HANDOFF_KT_2026-07-08.md)
- [UI Developer Handoff KT](./UI_DEVELOPER_HANDOFF_KT.md)

## Current Active API Scope

- `POST /api/auth/api-post-authenticate-user`
- `POST /api/user/api-post-add-update-user`

## Current Active Route Files

- `routes/auth.js`
- `routes/user.js`

## Current Local Runtime

- Local port from `.env`: `3103`
- Swagger URL: `http://localhost:3103/api/api-docs`
- Swagger server config: relative `/`, so "Try it out" calls the same host and
  port where Swagger is opened.

Older event, attendee, payment, file upload, and email routes remain in the
workspace, but they are not mounted from `index.js` for the City Survey scope.
