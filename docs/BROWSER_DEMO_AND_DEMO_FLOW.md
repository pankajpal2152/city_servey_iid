# Browser Demo and Demo Flow

Date: 2026-07-15

## Demo Goal

Show that the City Survey Node.js backend is connected to the `DEV_CITY_SURVEY`
RDS database and that the active APIs work end to end:

- Authenticate user
- View user list with JWT protection
- Add/update user with JWT protection
- View customer list with JWT protection
- View specific customer details with JWT protection
- Add/update customer details with JWT protection
- View project list with JWT protection
- Add/update project with JWT protection
- View system roles with JWT protection
- Add/update system role with JWT protection
- View survey types with JWT protection
- Add/update survey type with JWT protection
- View property types with JWT protection
- Add/update property type with JWT protection
- View master details with JWT protection
- Health check without JWT

## Pre-Demo Checklist

1. Confirm `.env` is configured.

```powershell
Get-Content .env
```

Required values:

- `PORT`
- `DB_HOST`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `JWT_SECRET`

2. Check whether the configured local port `3103` is already used.

```powershell
Get-NetTCPConnection -LocalPort 3103 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess,@{Name='ProcessName';Expression={(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName}}
```

3. Start the backend.

```powershell
npm start
```

If port `3103` is busy, start on a different temporary port:

```powershell
$env:PORT='3104'
npm start
```

4. Open Swagger in the browser.

`http://localhost:3103/api/api-docs`

If you use a different `PORT`, open Swagger on that same port. Swagger calls
the current browser host because `docs/swagger.js` uses `servers: [{ url: '/' }]`.

## Browser Demo Flow Through Swagger

### Step 1: Show Swagger Loads

Open:

`http://localhost:3103/api/api-docs`

Expected:

- Page title: `City Survey Node.js API`
- Visible tags:
  - `Health`
  - `Auth`
  - `User`
  - `Customer`
  - `Project`
  - `Master`
- Visible APIs:
  - `GET /health`
  - `POST /api/auth/api-post-authenticate-user`
  - `GET /api/user/api-get-view-user-list-info`
  - `POST /api/user/api-post-add-update-user`
  - `GET /api/customer/api-get-view-list-customer-details`
  - `GET /api/customer/api-get-view-specific-customer-details`
  - `POST /api/customer/api-post-add-update-customer-details`
  - `GET /api/project/api-get-view-list-project-details`
  - `POST /api/project/api-post-add-update-project`
  - `GET /api/master/api-get-view-master-system-roles`
  - `POST /api/master/api-post-add-update-master-system-role`
  - `GET /api/master/api-get-view-master-survey-type`
  - `POST /api/master/api-post-add-update-master-survey-type`
  - `GET /api/master/api-get-view-master-property-type`
  - `POST /api/master/api-post-add-update-master-property-type`
  - `GET /api/master/api-get-view-master-details`

### Step 2: Show Health Check

Open:

`GET /health`

Click:

`Try it out`

Click:

`Execute`

Expected:

- HTTP 200
- Response contains `status`, `response`, `uptime`, and `timestamp`

### Step 3: Show Login Validation

Open:

`POST /api/auth/api-post-authenticate-user`

Click:

`Try it out`

Use invalid body:

```json
{}
```

Click:

`Execute`

Expected:

- HTTP 400
- Response:

```json
{
  "status": "false",
  "response": "USER_NAME and PASSWORD are required"
}
```

### Step 4: Authenticate Valid User

Use body:

```json
[
  {
    "USER_NAME": "sai@yopmail.com",
    "PASSWORD": "Abc@1234"
  }
]
```

Expected:

- HTTP 200
- `status: true`
- `Token` exists in response
- User details returned from database, for example `FIRST_NAME`, `EMAIL_ID`,
  `USER_SYS_ID`, and `SYSTEM_ROLE_NAME`

Copy the `Token` value for the next step.

### Step 5: Authorize Swagger

Click:

`Authorize`

Enter:

```text
Bearer <Token from login response>
```

Click:

`Authorize`

Close the modal.

### Step 6: Test Protected User List API

Open:

`GET /api/user/api-get-view-user-list-info`

Click:

`Try it out`

Keep `ITEM` as `VIEW_ALL` or leave it empty.

Click:

`Execute`

Expected:

- HTTP 200
- Response contains `status: true`
- Response contains user rows when data exists

### Step 7: Test Protected Add/Update User API Safely

Open:

`POST /api/user/api-post-add-update-user`

Click:

`Try it out`

Use the existing sample user:

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

Expected safe demo result:

- HTTP 200
- DB response similar to:

```json
{
  "status": "false",
  "response": "This Email Id Already Exists"
}
```

This is a good demo result because it proves:

- Swagger reached the Express route
- JWT middleware accepted the token
- Express reached the RDS stored procedure
- The stored procedure checked real database data
- No duplicate sample user was created

### Step 8: Test Protected Customer List API

Open:

`GET /api/customer/api-get-view-list-customer-details`

Click:

`Try it out`

Keep `ITEM` as `VIEW_ALL` or leave it empty.

Click:

`Execute`

Expected:

- HTTP 200
- Response contains `status: true`
- Response contains customer rows and nested `PIC_DETAILS` when data exists

### Step 9: Test Protected Specific Customer Details API

Open:

`GET /api/customer/api-get-view-specific-customer-details`

Click:

`Try it out`

Use:

```text
ITEM=PROFILE
CUSTOMER_SYS_ID=4
```

Click:

`Execute`

Expected:

- HTTP 200
- Response contains `status: true`
- Response contains the specific customer profile/details when the customer id exists

### Step 10: Test Protected Customer API Routing Safely

Open:

`POST /api/customer/api-post-add-update-customer-details`

Click:

`Try it out`

Use a validation-only body:

```json
{
  "ITEM": "ADD"
}
```

Expected safe demo result:

- HTTP 400
- Response such as:

```json
{
  "status": "false",
  "response": "CUSTOMER_TYPE is required"
}
```

This proves Swagger and JWT reach the customer route without creating a
customer record.

Only execute the full database developer sample if the team approves creating
real dev DB customer and PIC records.

### Step 11: Test Protected Project List API

Open:

`GET /api/project/api-get-view-list-project-details`

Click:

`Try it out`

Keep `ITEM` as `VIEW_ALL` or leave it empty.

Click:

`Execute`

Expected:

- HTTP 200
- Response contains `status: true`
- Response contains project rows when data exists

### Step 12: Test Protected Project API Routing Safely

Open:

`POST /api/project/api-post-add-update-project`

Click:

`Try it out`

Use a validation-only body:

```json
{
  "ITEM": "ADD"
}
```

Expected safe demo result:

- HTTP 400
- Response such as:

```json
{
  "status": "false",
  "response": "CUSTOMER_SYS_ID is required"
}
```

This proves Swagger and JWT reach the project route without creating a project
record.

Only execute the full database developer sample if the team approves creating
real dev DB project records.

### Step 13: Test Protected System Role List API

Open:

`GET /api/master/api-get-view-master-system-roles`

Click:

`Try it out`

Keep `ITEM` as `VIEW_ALL`. Use `0` for `RECORD_SYS_ID` and
`ORGANIZATION_SYS_ID` unless testing a specific filter.

Click:

`Execute`

Expected:

- HTTP 200
- Response contains `status: true`
- Response contains system role rows when data exists

### Step 14: Test Protected System Role API Routing Safely

Open:

`POST /api/master/api-post-add-update-master-system-role`

Click:

`Try it out`

Use a validation-only body:

```json
{
  "ITEM": "ADD"
}
```

Expected safe demo result:

- HTTP 400
- Response such as:

```json
{
  "status": "false",
  "response": "RECORD_SYS_ID is required"
}
```

This proves Swagger and JWT reach the system-role master route without creating
a system-role record.

### Step 15: Test Protected Survey Type List API

Open:

`GET /api/master/api-get-view-master-survey-type`

Click:

`Try it out`

Keep `ITEM` as `VIEW_ALL`. Use `0` for `RECORD_SYS_ID` and
`ORGANIZATION_SYS_ID` unless testing a specific filter.

Click:

`Execute`

Expected:

- HTTP 200
- Response contains `status: true`
- Response contains survey type rows when data exists

### Step 16: Test Protected Survey Type API Routing Safely

Open:

`POST /api/master/api-post-add-update-master-survey-type`

Click:

`Try it out`

Use a validation-only body:

```json
{
  "ITEM": "ADD"
}
```

Expected safe demo result:

- HTTP 400
- Response such as:

```json
{
  "status": "false",
  "response": "RECORD_SYS_ID is required"
}
```

This proves Swagger and JWT reach the survey-type master route without creating
a survey-type record.

### Step 17: Test Protected Property Type List API

Open:

`GET /api/master/api-get-view-master-property-type`

Click:

`Try it out`

Keep `ITEM` as `VIEW_ALL`. Use `0` for `RECORD_SYS_ID` and
`ORGANIZATION_SYS_ID` unless testing a specific filter.

Click:

`Execute`

Expected:

- HTTP 200
- Response contains `status: true`
- Response contains property type rows when data exists

### Step 18: Test Protected Property Type API Routing Safely

Open:

`POST /api/master/api-post-add-update-master-property-type`

Click:

`Try it out`

Use a validation-only body:

```json
{
  "ITEM": "ADD"
}
```

Expected safe demo result:

- HTTP 400
- Response such as:

```json
{
  "status": "false",
  "response": "RECORD_SYS_ID is required"
}
```

This proves Swagger and JWT reach the property-type master route without
creating a property-type record.

### Step 19: Test Protected Master Details API

Open:

`GET /api/master/api-get-view-master-details`

Click:

`Try it out`

Keep `ITEM` as `VIEW_ALL`. Use `0` for `RECORD_SYS_ID` and
`ORGANIZATION_SYS_ID` unless testing a specific filter.

Click:

`Execute`

Expected:

- HTTP 200
- Response contains `status: true`
- Response contains master details rows when data exists

Only execute full database developer samples if the team approves creating real
dev DB system-role, survey-type, or property-type records.

## Full Demo Storyline for Senior Developer

1. "The app starts from `index.js`, where City Survey auth, user, customer,
   project, master data, and health routes are mounted."
2. "Database connection comes from `.env` through `config/db.js`; no hardcoded
   DB credentials are needed in source."
3. "Swagger is limited to the active City Survey APIs, so old event/payment APIs
   are not shown."
4. "First I will prove the API process is running with `GET /health`."
5. "Then I will prove request validation with an empty auth payload."
6. "Now I will login using the sample database user and copy the JWT token."
7. "Now I will authorize Swagger and call the protected read-only user list API."
8. "Then I will call the protected add/update user API."
9. "The duplicate email response proves API to DB integration without creating a
   new user during the demo."
10. "Then I will show the read-only customer list API."
11. "Then I will open one specific customer profile/details record."
12. "For customer add/update, I will show the protected route validation. The
   full sample is a write operation and should be run only with team approval."
13. "Then I will show the read-only project list API."
14. "For project add/update, I will show the protected route validation. The
   full sample is also a write operation and should be run only with team
   approval."
15. "Then I will show the read-only system role list API."
16. "For system role add/update, I will show the protected route validation. The
   full sample is also a write operation and should be run only with team
   approval."

## Browser Console Demo Alternative

If Swagger is not preferred, open the browser console on:

`http://localhost:3103/api/api-docs`

Run:

```javascript
const baseUrl = 'http://localhost:3103';

const healthResponse = await fetch(`${baseUrl}/health`);
console.log(healthResponse.status, await healthResponse.json());

const authResponse = await fetch(`${baseUrl}/api/auth/api-post-authenticate-user`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify([{ USER_NAME: 'sai@yopmail.com', PASSWORD: 'Abc@1234' }]),
});

const authJson = await authResponse.json();
console.log(authResponse.status, authJson);
```

Then run:

```javascript
const userListResponse = await fetch(`${baseUrl}/api/user/api-get-view-user-list-info?ITEM=VIEW_ALL`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authJson.Token}`,
  },
});

console.log(userListResponse.status, await userListResponse.json());

const userResponse = await fetch(`${baseUrl}/api/user/api-post-add-update-user`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authJson.Token}`,
  },
  body: JSON.stringify({
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
  }),
});

console.log(userResponse.status, await userResponse.json());
```

To view the customer list:

```javascript
const customerListResponse = await fetch(`${baseUrl}/api/customer/api-get-view-list-customer-details?ITEM=VIEW_ALL`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authJson.Token}`,
  },
});

console.log(customerListResponse.status, await customerListResponse.json());
```

To view one specific customer profile:

```javascript
const specificCustomerResponse = await fetch(`${baseUrl}/api/customer/api-get-view-specific-customer-details?ITEM=PROFILE&CUSTOMER_SYS_ID=4`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authJson.Token}`,
  },
});

console.log(specificCustomerResponse.status, await specificCustomerResponse.json());
```

To validate the customer route without writing data:

```javascript
const customerValidationResponse = await fetch(`${baseUrl}/api/customer/api-post-add-update-customer-details`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authJson.Token}`,
  },
  body: JSON.stringify({ ITEM: 'ADD' }),
});

console.log(customerValidationResponse.status, await customerValidationResponse.json());
```

To validate the project route without writing data:

```javascript
const projectListResponse = await fetch(`${baseUrl}/api/project/api-get-view-list-project-details?ITEM=VIEW_ALL`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authJson.Token}`,
  },
});

console.log(projectListResponse.status, await projectListResponse.json());
```

To validate the project add/update route without writing data:

```javascript
const projectValidationResponse = await fetch(`${baseUrl}/api/project/api-post-add-update-project`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authJson.Token}`,
  },
  body: JSON.stringify({ ITEM: 'ADD' }),
});

console.log(projectValidationResponse.status, await projectValidationResponse.json());
```

To view the system-role list:

```javascript
const systemRoleListResponse = await fetch(`${baseUrl}/api/master/api-get-view-master-system-roles?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authJson.Token}`,
  },
});

console.log(systemRoleListResponse.status, await systemRoleListResponse.json());
```

To view the survey type list:

```javascript
const surveyTypeListResponse = await fetch(`${baseUrl}/api/master/api-get-view-master-survey-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authJson.Token}`,
  },
});

console.log(surveyTypeListResponse.status, await surveyTypeListResponse.json());
```

To view the property type list:

```javascript
const propertyTypeListResponse = await fetch(`${baseUrl}/api/master/api-get-view-master-property-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authJson.Token}`,
  },
});

console.log(propertyTypeListResponse.status, await propertyTypeListResponse.json());
```

To view the master details list:

```javascript
const masterDetailsResponse = await fetch(`${baseUrl}/api/master/api-get-view-master-details?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authJson.Token}`,
  },
});

console.log(masterDetailsResponse.status, await masterDetailsResponse.json());
```

To validate the system-role add/update route without writing data:

```javascript
const systemRoleValidationResponse = await fetch(`${baseUrl}/api/master/api-post-add-update-master-system-role`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authJson.Token}`,
  },
  body: JSON.stringify({ ITEM: 'ADD' }),
});

console.log(systemRoleValidationResponse.status, await systemRoleValidationResponse.json());
```

To validate the survey-type add/update route without writing data:

```javascript
const surveyTypeValidationResponse = await fetch(`${baseUrl}/api/master/api-post-add-update-master-survey-type`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authJson.Token}`,
  },
  body: JSON.stringify({ ITEM: 'ADD' }),
});

console.log(surveyTypeValidationResponse.status, await surveyTypeValidationResponse.json());
```

To validate the property-type add/update route without writing data:

```javascript
const propertyTypeValidationResponse = await fetch(`${baseUrl}/api/master/api-post-add-update-master-property-type`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authJson.Token}`,
  },
  body: JSON.stringify({ ITEM: 'ADD' }),
});

console.log(propertyTypeValidationResponse.status, await propertyTypeValidationResponse.json());
```

## Demo Do Not Do List

- Do not use a new random email in the add user demo unless the team wants a
  real dev database user to be created.
- Do not execute the full customer sample unless the team wants real dev
  customer/PIC records to be created.
- Do not execute the full project sample unless the team wants real dev project
  records to be created.
- Do not execute the full system-role sample unless the team wants real dev
  system-role records to be created.
- Do not execute the full survey-type sample unless the team wants real dev
  survey-type records to be created.
- Do not execute the full property-type sample unless the team wants real dev
  property-type records to be created.
- Do not paste database passwords into screen-shared notes.
- Do not re-enable old routes in `index.js` for this demo.
- Do not use production database credentials for local demo.
