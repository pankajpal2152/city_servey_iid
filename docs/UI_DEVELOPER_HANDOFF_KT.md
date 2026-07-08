# UI Developer Handoff KT

Date: 2026-07-08

## Purpose

This document explains how the UI should integrate with the current City Survey
backend APIs.

## Base URL

Local default:

```text
http://localhost:3103
```

Temporary local example:

```text
http://localhost:3104
```

Dev server:

```text
http://<dev-server-host>:<port>
```

## Active API List

| Feature | Method | Endpoint | Auth Required |
| --- | --- | --- | --- |
| User login | POST | `/api/auth/api-post-authenticate-user` | No |
| Add/update user | POST | `/api/user/api-post-add-update-user` | Yes |

## Login Integration

### Request

```http
POST /api/auth/api-post-authenticate-user
Content-Type: application/json
```

Preferred body:

```json
[
  {
    "USER_NAME": "sai@yopmail.com",
    "PASSWORD": "Abc@1234"
  }
]
```

Object body also works:

```json
{
  "USER_NAME": "sai@yopmail.com",
  "PASSWORD": "Abc@1234"
}
```

### Successful Response

The response contains:

- `Token`
- `status`
- `response`
- user fields from DB such as `USER_SYS_ID`, `FIRST_NAME`, `EMAIL_ID`,
  `SYSTEM_ROLE_NAME`, `ORGANISATION_SYS_ID`

Example shape:

```json
{
  "Token": "<jwt-token>",
  "status": "true",
  "response": "User login is successful.",
  "USER_SYS_ID": 3,
  "FIRST_NAME": "Sai",
  "EMAIL_ID": "sai@yopmail.com",
  "SYSTEM_ROLE_NAME": "Admin",
  "ORGANISATION_SYS_ID": 1
}
```

### Frontend Login Handling

On success:

- Store `Token` in the frontend auth state.
- Use the token for protected APIs.
- Redirect to dashboard or user management page.

On failure:

- If HTTP 400, show missing field validation.
- If HTTP 401, show invalid credentials.
- If HTTP 500, show server or database error message.

## Token Usage

Protected APIs require:

```http
Authorization: Bearer <Token>
```

Token expiry:

- Backend signs login tokens for `7d`.

Recommended UI behavior:

- If API returns 401, redirect user to login.
- If API returns 403, clear token and redirect user to login.
- Do not send protected API requests without token.

## Add/Update User Integration

### Request

```http
POST /api/user/api-post-add-update-user
Content-Type: application/json
Authorization: Bearer <Token>
```

Body:

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

### Field Mapping

| UI Field | Payload Key | Required for Add | Suggested UI Validation |
| --- | --- | --- | --- |
| Action | `ITEM` | Yes | Use `ADD_USER` for create. Confirm update value with backend/DB team. |
| User ID | `USER_SYS_ID` | Yes | `0` for add. Existing user id for update. |
| Role | `SYSTEM_ROLE_SYS_ID` | Yes | Dropdown once role list API is available. |
| First name | `FIRST_NAME` | Yes | Required, trim whitespace. |
| Last name | `LAST_NAME` | Yes | Required, trim whitespace. |
| Gender | `GENDER` | Optional until DB confirms | Dropdown or radio. |
| Mobile number | `MOBILE_NO` | Yes | Digits only, length validation as per product rule. |
| Email | `EMAIL_ID` | Yes | Email format validation. |
| Organization | `ORGANISATION_SYS_ID` | Yes | Dropdown once organization list API is available. |
| Password | `PASSWORD` | Yes for add | Enforce product password policy when confirmed. |
| Created by | `CREATED_BY` | Yes | Use logged-in user's `USER_SYS_ID` when available. |

### Response Handling

Success or business validation responses come from the stored procedure.

Example duplicate email response:

```json
{
  "status": "false",
  "response": "This Email Id Already Exists"
}
```

UI should display the `response` message to the user.

## JavaScript Fetch Example

```javascript
const baseUrl = 'http://localhost:3103';

export async function login(userName, password) {
  const response = await fetch(`${baseUrl}/api/auth/api-post-authenticate-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ USER_NAME: userName, PASSWORD: password }]),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.response || data.error || 'Login failed');
  }

  return data;
}

export async function addUser(token, payload) {
  const response = await fetch(`${baseUrl}/api/user/api-post-add-update-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.response || data.error || 'User save failed');
  }

  return data;
}
```

## Axios Example

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3103',
});

export async function login(userName, password) {
  const { data } = await api.post('/api/auth/api-post-authenticate-user', [
    { USER_NAME: userName, PASSWORD: password },
  ]);

  return data;
}

export async function addUser(token, payload) {
  const { data } = await api.post('/api/user/api-post-add-update-user', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data;
}
```

## Suggested UI Pages

### Login Page

Fields:

- Email or username
- Password

Behavior:

- Disable submit while loading.
- Show DB `response` message on failure.
- Store token and user details on success.

### User Management Page

Fields:

- Role
- First name
- Last name
- Gender
- Mobile number
- Email
- Organization
- Password

Behavior:

- Require login token.
- Send payload to add/update API.
- Show success or failure message from `response`.
- For demo, use existing sample email to show duplicate validation safely.

## Frontend Demo Flow

1. Open login page.
2. Enter:
   - Username: `sai@yopmail.com`
   - Password: `Abc@1234`
3. Submit login.
4. Confirm user reaches dashboard or user management page.
5. Open add user form.
6. Submit sample existing user.
7. Confirm duplicate email message appears.

## Open Questions for UI Team

- Where should token be stored: memory, local storage, session storage, or app
  auth provider?
- What password policy should be shown in the UI?
- What APIs will provide role and organization dropdown values?
- What is the final update-user contract?
- Should the UI support logout and token expiry messaging in this phase?

## Do Not Do

- Do not hardcode the JWT token in UI code.
- Do not hardcode database credentials in UI code.
- Do not create users with random real emails during demos unless approved.
- Do not assume old event or attendee APIs are active for City Survey.
