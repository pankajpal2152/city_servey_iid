# City Survey Dev Server API URLs

Date: 2026-07-17

This file is the UI developer handoff reference for the active City Survey
backend APIs shown in Swagger.

## Dev Server

Base API URL:

```text
https://api-dev.citysurveyors.com.sg
```

Swagger URL:

```text
https://api-dev.citysurveyors.com.sg/api/api-docs/
```

Local backend URL, only when running the Node.js API on this machine:

```text
http://localhost:3103
```

## Frontend Environment Value

Use this value in the frontend environment file:

```env
VITE_API_BASE_URL=https://api-dev.citysurveyors.com.sg
```

If the frontend is not using Vite, keep the same URL and use the framework's
required variable name, for example `REACT_APP_API_BASE_URL`,
`NEXT_PUBLIC_API_BASE_URL`, or the existing project convention.

## Common Headers

For all JSON requests:

```http
Content-Type: application/json
Accept: application/json
```

Protected APIs also require the login token:

```http
Authorization: Bearer <Token>
```

The token comes from `POST /api/auth/api-post-authenticate-user` in the
response field named `Token`.

## Full Dev Server API URLs

| Module   | Method | Dev Server URL                                                                                         | Auth Required |
| -------- | ------ | ------------------------------------------------------------------------------------------------------ | ------------- |
| Health   | GET    | `https://api-dev.citysurveyors.com.sg/health`                                                        | No            |
| Auth     | POST   | `https://api-dev.citysurveyors.com.sg/api/auth/api-post-authenticate-user`                           | No            |
| User     | GET    | `https://api-dev.citysurveyors.com.sg/api/user/api-get-view-user-list-info?ITEM=VIEW_ALL`            | Yes           |
| User     | POST   | `https://api-dev.citysurveyors.com.sg/api/user/api-post-add-update-user`                             | Yes           |
| Customer | GET    | `https://api-dev.citysurveyors.com.sg/api/customer/api-get-view-list-customer-details?ITEM=VIEW_ALL` | Yes           |
| Customer | GET    | `https://api-dev.citysurveyors.com.sg/api/customer/api-get-view-specific-customer-details?ITEM=PROFILE&CUSTOMER_SYS_ID=4` | Yes |
| Customer | POST   | `https://api-dev.citysurveyors.com.sg/api/customer/api-post-add-update-customer-details`             | Yes           |
| Project  | GET    | `https://api-dev.citysurveyors.com.sg/api/project/api-get-view-list-project-details?ITEM=VIEW_ALL`   | Yes           |
| Project  | GET    | `https://api-dev.citysurveyors.com.sg/api/project/api-get-view-specific-project-details?ITEM=SPECIFIC&PROJECT_SYS_ID=2` | Yes |
| Project  | GET    | `https://api-dev.citysurveyors.com.sg/api/project/api-get-view-specific-customer-wise-project-details?ITEM=SPECIFIC&CUSTOMER_SYS_ID=4` | Yes |
| Project  | POST   | `https://api-dev.citysurveyors.com.sg/api/project/api-post-add-update-project`                       | Yes           |
| Master   | GET    | `https://api-dev.citysurveyors.com.sg/api/master/api-get-view-master-system-roles?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0` | Yes |
| Master   | POST   | `https://api-dev.citysurveyors.com.sg/api/master/api-post-add-update-master-system-role`             | Yes           |
| Master   | GET    | `https://api-dev.citysurveyors.com.sg/api/master/api-get-view-master-survey-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0` | Yes |
| Master   | POST   | `https://api-dev.citysurveyors.com.sg/api/master/api-post-add-update-master-survey-type`             | Yes           |
| Master   | GET    | `https://api-dev.citysurveyors.com.sg/api/master/api-get-view-master-property-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0` | Yes |
| Master   | POST   | `https://api-dev.citysurveyors.com.sg/api/master/api-post-add-update-master-property-type`           | Yes           |
| Master   | GET    | `https://api-dev.citysurveyors.com.sg/api/master/api-get-view-master-details?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0` | Yes |

## Relative API Paths

Use these paths when the frontend already has `VITE_API_BASE_URL` or another
base URL configured:

```text
GET  /health
POST /api/auth/api-post-authenticate-user
GET  /api/user/api-get-view-user-list-info?ITEM=VIEW_ALL
POST /api/user/api-post-add-update-user
GET  /api/customer/api-get-view-list-customer-details?ITEM=VIEW_ALL
GET  /api/customer/api-get-view-specific-customer-details?ITEM=PROFILE&CUSTOMER_SYS_ID=4
POST /api/customer/api-post-add-update-customer-details
GET  /api/project/api-get-view-list-project-details?ITEM=VIEW_ALL
GET  /api/project/api-get-view-specific-project-details?ITEM=SPECIFIC&PROJECT_SYS_ID=2
GET  /api/project/api-get-view-specific-customer-wise-project-details?ITEM=SPECIFIC&CUSTOMER_SYS_ID=4
POST /api/project/api-post-add-update-project
GET  /api/master/api-get-view-master-system-roles?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0
POST /api/master/api-post-add-update-master-system-role
GET  /api/master/api-get-view-master-survey-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0
POST /api/master/api-post-add-update-master-survey-type
GET  /api/master/api-get-view-master-property-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0
POST /api/master/api-post-add-update-master-property-type
GET  /api/master/api-get-view-master-details?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0
```

## 1. Health Check

```text
GET https://api-dev.citysurveyors.com.sg/health
```

Auth required: No

Success response shape:

```json
{
  "status": "true",
  "response": "City Survey API is running",
  "uptime": 123.45,
  "timestamp": "2026-07-17T00:00:00.000Z"
}
```

## 2. Authenticate User

```text
POST https://api-dev.citysurveyors.com.sg/api/auth/api-post-authenticate-user
```

Auth required: No

Request body:

```json
[
  {
    "USER_NAME": "sai@yopmail.com",
    "PASSWORD": "Abc@1234"
  }
]
```

Frontend usage:

- On success, read `Token` from the response.
- Store the token according to the frontend project's auth pattern.
- Send `Authorization: Bearer <Token>` for protected APIs.

## 3. View User List

```text
GET https://api-dev.citysurveyors.com.sg/api/user/api-get-view-user-list-info?ITEM=VIEW_ALL
```

Auth required: Yes

Query parameter:

| Name     | Required | Default      | Example      |
| -------- | -------- | ------------ | ------------ |
| `ITEM` | No       | `VIEW_ALL` | `VIEW_ALL` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/user/api-get-view-user-list-info?ITEM=VIEW_ALL`;
```

## 4. Add or Update User

```text
POST https://api-dev.citysurveyors.com.sg/api/user/api-post-add-update-user
```

Auth required: Yes

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

## 5. View Customer List

```text
GET https://api-dev.citysurveyors.com.sg/api/customer/api-get-view-list-customer-details?ITEM=VIEW_ALL
```

Auth required: Yes

Query parameter:

| Name     | Required | Default      | Example      |
| -------- | -------- | ------------ | ------------ |
| `ITEM` | No       | `VIEW_ALL` | `VIEW_ALL` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/customer/api-get-view-list-customer-details?ITEM=VIEW_ALL`;
```

## 6. View Specific Customer Details

```text
GET https://api-dev.citysurveyors.com.sg/api/customer/api-get-view-specific-customer-details?ITEM=PROFILE&CUSTOMER_SYS_ID=4
```

Auth required: Yes

Query parameters:

| Name | Required | Default | Example |
| --- | --- | --- | --- |
| `ITEM` | No | `PROFILE` | `PROFILE` |
| `CUSTOMER_SYS_ID` | Yes | None | `4` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/customer/api-get-view-specific-customer-details?ITEM=PROFILE&CUSTOMER_SYS_ID=4`;
```

## 7. Add or Update Customer Details

```text
POST https://api-dev.citysurveyors.com.sg/api/customer/api-post-add-update-customer-details
```

Auth required: Yes

Request body:

```json
{
  "ITEM": "ADD",
  "CUSTOMER_TYPE": "Individual",
  "CUSTOMER_NAME": "Ravi",
  "BILLING_ADDRESS": "Kolkata",
  "CREATED_BY": 1,
  "PIC": [
    {
      "FULL_NAME": "Ranjan",
      "CONTACT_NO": "7875585",
      "EMAIL_ID": "ranjan@gmail.com",
      "DEPARTMENT": "Back Office",
      "DESIGNATION": "Employee"
    },
    {
      "FULL_NAME": "Manoj",
      "CONTACT_NO": "7852479",
      "EMAIL_ID": "manoj@gmail.com",
      "DEPARTMENT": "Back Office",
      "DESIGNATION": "Employee"
    }
  ]
}
```

Running this sample with a valid token may create records in the dev database.

## 8. View Project List

```text
GET https://api-dev.citysurveyors.com.sg/api/project/api-get-view-list-project-details?ITEM=VIEW_ALL
```

Auth required: Yes

Query parameter:

| Name     | Required | Default      | Example      |
| -------- | -------- | ------------ | ------------ |
| `ITEM` | No       | `VIEW_ALL` | `VIEW_ALL` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/project/api-get-view-list-project-details?ITEM=VIEW_ALL`;
```

## 9. View Specific Project Details

```text
GET https://api-dev.citysurveyors.com.sg/api/project/api-get-view-specific-project-details?ITEM=SPECIFIC&PROJECT_SYS_ID=2
```

Auth required: Yes

Query parameters:

| Name | Required | Default | Example |
| --- | --- | --- | --- |
| `ITEM` | No | `SPECIFIC` | `SPECIFIC` |
| `PROJECT_SYS_ID` | Yes | None | `2` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/project/api-get-view-specific-project-details?ITEM=SPECIFIC&PROJECT_SYS_ID=2`;
```

## 10. View Specific Customer-Wise Project Details

```text
GET https://api-dev.citysurveyors.com.sg/api/project/api-get-view-specific-customer-wise-project-details?ITEM=SPECIFIC&CUSTOMER_SYS_ID=4
```

Auth required: Yes

Query parameters:

| Name | Required | Default | Example |
| --- | --- | --- | --- |
| `ITEM` | No | `SPECIFIC` | `SPECIFIC` |
| `CUSTOMER_SYS_ID` | Yes | None | `4` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/project/api-get-view-specific-customer-wise-project-details?ITEM=SPECIFIC&CUSTOMER_SYS_ID=4`;
```

## 11. Add or Update Project

```text
POST https://api-dev.citysurveyors.com.sg/api/project/api-post-add-update-project
```

Auth required: Yes

Request body:

```json
{
  "ITEM": "ADD",
  "CUSTOMER_SYS_ID": 17,
  "PIC_SYS_ID": 22,
  "SITE_ADDRESS": "51 Jalan Kukoh 01-37, 1620051, Singapore",
  "ASSIGNED_SURVEYOR_SYS_ID": 1,
  "ASSIGNED_SURVEYOR": "Marcus Koh",
  "SURVEY_TYPE_SYS_ID": 5,
  "PROPERTY_TYPE_SYS_ID": 15,
  "CREATED_BY": 1
}
```

Running this sample with a valid token may create records in the dev database.

## 12. View Master System Roles

```text
GET https://api-dev.citysurveyors.com.sg/api/master/api-get-view-master-system-roles?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0
```

Auth required: Yes

Query parameters:

| Name | Required | Default | Example |
| --- | --- | --- | --- |
| `ITEM` | No | `VIEW_ALL` | `VIEW_ALL` |
| `RECORD_SYS_ID` | No | `0` | `0` |
| `ORGANIZATION_SYS_ID` | No | `0` | `0` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/master/api-get-view-master-system-roles?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0`;
```

## 13. Add or Update Master System Role

```text
POST https://api-dev.citysurveyors.com.sg/api/master/api-post-add-update-master-system-role
```

Auth required: Yes

Request body:

```json
{
  "ITEM": "ADD",
  "RECORD_SYS_ID": "0",
  "SYSTEM_ROLE": "Business Admin",
  "ROLE_DESC": "Business Admin",
  "USER_TYPE": "Internal",
  "CREATED_BY": 1
}
```

Running this sample with a valid token may create records in the dev database.

## 14. View Master Survey Type

```text
GET https://api-dev.citysurveyors.com.sg/api/master/api-get-view-master-survey-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0
```

Auth required: Yes

Query parameters:

| Name | Required | Default | Example |
| --- | --- | --- | --- |
| `ITEM` | No | `VIEW_ALL` | `VIEW_ALL` |
| `RECORD_SYS_ID` | No | `0` | `0` |
| `ORGANIZATION_SYS_ID` | No | `0` | `0` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/master/api-get-view-master-survey-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0`;
```

## 15. Add or Update Master Survey Type

```text
POST https://api-dev.citysurveyors.com.sg/api/master/api-post-add-update-master-survey-type
```

Auth required: Yes

Request body:

```json
{
  "ITEM": "ADD",
  "RECORD_SYS_ID": "0",
  "SURVEY_TYPE": "Seminer",
  "CREATED_BY": "1"
}
```

Running this sample with a valid token may create records in the dev database.

## 16. View Master Property Type

```text
GET https://api-dev.citysurveyors.com.sg/api/master/api-get-view-master-property-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0
```

Auth required: Yes

Query parameters:

| Name | Required | Default | Example |
| --- | --- | --- | --- |
| `ITEM` | No | `VIEW_ALL` | `VIEW_ALL` |
| `RECORD_SYS_ID` | No | `0` | `0` |
| `ORGANIZATION_SYS_ID` | No | `0` | `0` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/master/api-get-view-master-property-type?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0`;
```

## 17. Add or Update Master Property Type

```text
POST https://api-dev.citysurveyors.com.sg/api/master/api-post-add-update-master-property-type
```

Auth required: Yes

Request body:

```json
{
  "ITEM": "ADD",
  "RECORD_SYS_ID": "0",
  "PROPERTY_TYPE": "Seminer",
  "CREATED_BY": "1"
}
```

Running this sample with a valid token may create records in the dev database.

## 18. View Master Details

```text
GET https://api-dev.citysurveyors.com.sg/api/master/api-get-view-master-details?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0
```

Auth required: Yes

Query parameters:

| Name | Required | Default | Example |
| --- | --- | --- | --- |
| `ITEM` | No | `VIEW_ALL` | `VIEW_ALL` |
| `RECORD_SYS_ID` | No | `0` | `0` |
| `ORGANIZATION_SYS_ID` | No | `0` | `0` |

Frontend usage:

```js
const url = `${API_BASE_URL}/api/master/api-get-view-master-details?ITEM=VIEW_ALL&RECORD_SYS_ID=0&ORGANIZATION_SYS_ID=0`;
```

## Swagger Visibility Checklist

The dev Swagger URL should show these tags:

- `Health`
- `Auth`
- `User`
- `Customer`
- `Project`
- `Master`

The dev Swagger URL should show these API paths:

- `GET /health`
- `POST /api/auth/api-post-authenticate-user`
- `GET /api/user/api-get-view-user-list-info`
- `POST /api/user/api-post-add-update-user`
- `GET /api/customer/api-get-view-list-customer-details`
- `GET /api/customer/api-get-view-specific-customer-details`
- `POST /api/customer/api-post-add-update-customer-details`
- `GET /api/project/api-get-view-list-project-details`
- `GET /api/project/api-get-view-specific-project-details`
- `GET /api/project/api-get-view-specific-customer-wise-project-details`
- `POST /api/project/api-post-add-update-project`
- `GET /api/master/api-get-view-master-system-roles`
- `POST /api/master/api-post-add-update-master-system-role`
- `GET /api/master/api-get-view-master-survey-type`
- `POST /api/master/api-post-add-update-master-survey-type`
- `GET /api/master/api-get-view-master-property-type`
- `POST /api/master/api-post-add-update-master-property-type`
- `GET /api/master/api-get-view-master-details`

After deployment, verify the Swagger list at:

```text
https://api-dev.citysurveyors.com.sg/api/api-docs/swagger-ui-init.js
```
