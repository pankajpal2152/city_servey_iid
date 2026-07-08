# Dev Server Deployment Checklist

Date: 2026-07-08

## Purpose

This checklist is for deploying the current City Survey Node.js backend on a
development server and verifying that the app, APIs, and RDS database are
connected correctly.

## 1. Code Checklist

- Confirm latest backend folder is present on the dev server.
- Confirm active files exist:
  - `index.js`
  - `config/db.js`
  - `routes/auth.js`
  - `routes/user.js`
  - `middlewares/auth.js`
  - `utils/procedureResponse.js`
  - `docs/swagger.js`
- Confirm old routes are not mounted from `index.js`:
  - `master`
  - `event`
  - `attendeesportal`
  - `fileuploaddownload`
  - `emailcontroller`
  - `payment`

## 2. Runtime Checklist

- Node.js installed.
- npm installed.
- Dependencies installed.

```powershell
npm install
```

For a clean CI-style install when `package-lock.json` is trusted:

```powershell
npm ci
```

## 3. Environment Checklist

Create or update `.env` on the dev server.

Required keys:

```env
PORT=3103
DB_HOST=<city-survey-rds-host>
DB_USER=<city-survey-db-user>
DB_PASS=<city-survey-db-password>
DB_NAME=DEV_CITY_SURVEY
JWT_SECRET=<strong-secret>
```

Important:

- Keep `.env` out of commits and screenshots.
- Do not hardcode database credentials in `config/db.js`.
- Rotate shared dev credentials if they are exposed outside the team.

## 4. Network Checklist

- Dev server can resolve the RDS host.
- Dev server can reach MySQL port `3306`.
- RDS security group allows the dev server IP.
- Local firewall allows outbound MySQL traffic.
- Application port, for example the current local `3103`, is open for
  browser/API access.

Basic DNS check:

```powershell
Resolve-DnsName $env:DB_HOST
```

Basic port check:

```powershell
Test-NetConnection $env:DB_HOST -Port 3306
```

## 5. Port Checklist

Check whether app port is busy:

```powershell
Get-NetTCPConnection -LocalPort 3103 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess,@{Name='ProcessName';Expression={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}}
```

If busy:

- Stop the old dev server process, or
- Change `PORT` in `.env`, or
- Start with a temporary port:

```powershell
$env:PORT='3104'
npm start
```

## 6. Syntax and Startup Checklist

Run syntax checks:

```powershell
node --check index.js
node --check routes\auth.js
node --check routes\user.js
node --check middlewares\auth.js
node --check utils\procedureResponse.js
node --check docs\swagger.js
```

Start app:

```powershell
npm start
```

Expected console:

```text
Server running at http://localhost:<PORT>
```

## 7. Database Verification Checklist

Verify:

- Database name is `DEV_CITY_SURVEY`
- Procedure `USP_POST_USER_AUTHENTICATE_ACTIVITY` exists
- Procedure `USP_POST_USER_PROFILE_ACTIVITY` exists
- Sample auth call returns `status: true`

Use the script from [Run and Test Guide](./RUN_AND_TEST_GUIDE.md).

## 8. API Verification Checklist

Verify with Swagger:

- Swagger opens at `/api/api-docs`
- Swagger "Try it out" calls the same host and port where Swagger is opened
  because the OpenAPI server URL is relative `/`.
- Auth API returns token for sample user
- Protected user API accepts the token
- Duplicate sample email returns `This Email Id Already Exists`

## 9. Dev Server Process Checklist

For a simple dev run:

```powershell
npm start
```

For a long-running dev server, use the team-approved process manager. Common
options:

- PM2
- Windows service
- IIS reverse proxy to Node.js
- Docker container
- Cloud process runner

If PM2 is used:

```powershell
npm install -g pm2
pm2 start index.js --name city-survey-api
pm2 logs city-survey-api
pm2 save
```

## 10. Browser Smoke Checklist

Open:

`http://<dev-server-host>:<port>/api/api-docs`

Then run:

1. Empty auth body should return HTTP 400.
2. Valid auth body should return HTTP 200 and token.
3. Add/update duplicate sample user should return HTTP 200 and duplicate email
   response.

## 11. Rollback Checklist

If deployment fails:

- Stop the new Node process.
- Restore previous `.env` if changed.
- Restore previous backend folder or release artifact.
- Restart previous process.
- Confirm Swagger opens.
- Confirm login API works.

## 12. Known Dev Notes

- During local testing on 2026-07-08, port `3000` was already occupied by a
  separate `node` process. The local City Survey `.env` now uses port `3103`.
- The add/update stored procedure commits internally, so avoid write tests with
  new email addresses unless the team approves creating a dev DB record.
