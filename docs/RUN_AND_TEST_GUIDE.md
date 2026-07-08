# Run and Test Guide

Date: 2026-07-08

## 1. Install Dependencies

```powershell
npm install
```

## 2. Confirm Environment

```powershell
Get-Content .env
```

Required keys:

- `PORT`
- `DB_HOST`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `JWT_SECRET`

## 3. Run Syntax Checks

```powershell
node --check index.js
node --check routes\auth.js
node --check routes\user.js
node --check middlewares\auth.js
node --check utils\procedureResponse.js
node --check docs\swagger.js
```

Expected:

- No output
- Exit code `0`

## 4. Test Database Connectivity

This test connects to RDS, confirms the active database, confirms both stored
procedures exist, and runs the sample authentication procedure.

```powershell
@'
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  const [[dbInfo]] = await connection.query('SELECT DATABASE() AS database_name, 1 AS connection_ok');
  console.log('DB connection:', dbInfo);

  const [procedures] = await connection.query(
    `SELECT ROUTINE_NAME
       FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_SCHEMA = ?
        AND ROUTINE_TYPE = 'PROCEDURE'
        AND ROUTINE_NAME IN (?, ?)
      ORDER BY ROUTINE_NAME`,
    [
      process.env.DB_NAME,
      'USP_POST_USER_AUTHENTICATE_ACTIVITY',
      'USP_POST_USER_PROFILE_ACTIVITY',
    ]
  );
  console.log('Procedures found:', procedures.map((row) => row.ROUTINE_NAME));

  const [authRows] = await connection.execute(
    'CALL USP_POST_USER_AUTHENTICATE_ACTIVITY(?, ?, @ERRNO, @ERRMSG);',
    ['AUTHENTICATE_USER', JSON.stringify([{ USER_NAME: 'sai@yopmail.com', PASSWORD: 'Abc@1234' }])]
  );
  const firstResult = authRows?.[0]?.[0]?.JSON_VALUE;
  console.log('Authenticate procedure returned:', typeof firstResult === 'string' ? firstResult : JSON.stringify(firstResult));

  await connection.end();
})().catch((error) => {
  console.error('DB test failed:', error.message);
  process.exit(1);
});
'@ | node -
```

Expected:

- `database_name` is `DEV_CITY_SURVEY`
- Both required procedure names are printed
- Auth procedure returns `status: true`

## 5. Start the API Server

Local dev server with nodemon:

```powershell
npm run dev
```

Normal non-watch server:

```powershell
npm start
```

Expected:

```text
Server running at http://localhost:<port>
```

## 6. Swagger Browser Test

Open:

`http://localhost:3103/api/api-docs`

If you override `PORT`, open Swagger on that same port. Swagger uses the
current browser host and port for API calls.

Run the browser demo steps from [Browser Demo and Demo Flow](./BROWSER_DEMO_AND_DEMO_FLOW.md).

## 7. PowerShell API Smoke Test

Use this when you want a repeatable command-line smoke test.

Start the API first in another terminal, then run:

```powershell
$baseUrl = 'http://localhost:3103'

$authBody = @(
  @{
    USER_NAME = 'sai@yopmail.com'
    PASSWORD = 'Abc@1234'
  }
) | ConvertTo-Json

$auth = Invoke-RestMethod `
  -Uri "$baseUrl/api/auth/api-post-authenticate-user" `
  -Method Post `
  -ContentType 'application/json' `
  -Body $authBody

$auth.Token
```

Expected:

- A JWT token is printed.

Then test protected user API:

```powershell
$headers = @{
  Authorization = "Bearer $($auth.Token)"
}

$userBody = @{
  ITEM = 'ADD_USER'
  USER_SYS_ID = 0
  SYSTEM_ROLE_SYS_ID = 1
  FIRST_NAME = 'Sai'
  LAST_NAME = 'Roy'
  GENDER = 'Male'
  MOBILE_NO = '7894561230'
  EMAIL_ID = 'sai@yopmail.com'
  ORGANISATION_SYS_ID = '1'
  PASSWORD = 'Abc@1234'
  CREATED_BY = '1'
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "$baseUrl/api/user/api-post-add-update-user" `
  -Method Post `
  -ContentType 'application/json' `
  -Headers $headers `
  -Body $userBody
```

Expected safe result:

```text
status response
------ --------
false  This Email Id Already Exists
```

## 8. Automated Local Smoke Script

This script starts the app on a temporary port, logs in, calls the protected
endpoint with the existing sample user, and verifies it does not create a
duplicate user.

```powershell
@'
require('dotenv').config();
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');

const port = '3103';
const baseUrl = `http://127.0.0.1:${port}`;
const sampleUser = {
  ITEM: 'ADD_USER',
  USER_SYS_ID: 0,
  SYSTEM_ROLE_SYS_ID: 1,
  FIRST_NAME: 'Sai',
  LAST_NAME: 'Roy',
  GENDER: 'Male',
  MOBILE_NO: '7894561230',
  EMAIL_ID: 'sai@yopmail.com',
  ORGANISATION_SYS_ID: '1',
  PASSWORD: 'Abc@1234',
  CREATED_BY: '1',
};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/api-post-authenticate-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (response.status === 400) return;
    } catch (error) {
      await sleep(500);
    }
  }
  throw new Error('Server did not become ready in time');
}

async function getEmailCount(connection) {
  const [[row]] = await connection.query(
    'SELECT COUNT(*) AS count FROM TBL_USER_DETAILS WHERE EMAIL_ID = ?',
    [sampleUser.EMAIL_ID]
  );
  return Number(row.count);
}

(async () => {
  const server = spawn(process.execPath, ['index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    await waitForServer();

    const authResponse = await fetch(`${baseUrl}/api/auth/api-post-authenticate-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ USER_NAME: sampleUser.EMAIL_ID, PASSWORD: sampleUser.PASSWORD }]),
    });
    const authJson = await authResponse.json();

    const beforeCount = await getEmailCount(connection);
    const userResponse = await fetch(`${baseUrl}/api/user/api-post-add-update-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authJson.Token}`,
      },
      body: JSON.stringify(sampleUser),
    });
    const userJson = await userResponse.json();
    const afterCount = await getEmailCount(connection);

    console.log({
      auth_http_status: authResponse.status,
      auth_status: authJson.status,
      token_returned: Boolean(authJson.Token),
      add_update_http_status: userResponse.status,
      add_update_response_status: userJson.status,
      add_update_response: userJson.response,
      sample_email_count_before: beforeCount,
      sample_email_count_after: afterCount,
      created_extra_sample_user: afterCount > beforeCount,
    });
  } finally {
    await connection.end();
    server.kill();
    await sleep(500);
  }
})().catch((error) => {
  console.error('Smoke test failed:', error.message);
  process.exit(1);
});
'@ | node -
```

Expected:

- `auth_http_status: 200`
- `auth_status: true`
- `token_returned: true`
- `add_update_http_status: 200`
- `add_update_response: This Email Id Already Exists`
- `created_extra_sample_user: false`

## 9. Write Test Warning

To test actual user creation, change `EMAIL_ID` and `MOBILE_NO` to unique values.

Only do this when the team agrees to create a real record in the dev database,
because the stored procedure commits internally.
