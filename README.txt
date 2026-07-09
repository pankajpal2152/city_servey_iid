# City Survey Node.js API

Express backend for the City Survey application. The active scope is user
authentication, user add/update, customer add/update, project add/update, and API health checks
through Node.js, Express, JWT, Swagger, and MySQL stored procedures.

## Active APIs

Dev server base URL for frontend integration:

```text
https://api-dev.citysurveyors.com.sg
```

Dev Swagger URL:

```text
https://api-dev.citysurveyors.com.sg/api/api-docs/
```

| Module | Method | Endpoint | Auth |
| --- | --- | --- | --- |
| Health | GET | `/health` | No |
| Auth | POST | `/api/auth/api-post-authenticate-user` | No |
| User | POST | `/api/user/api-post-add-update-user` | Yes |
| Customer | GET | `/api/customer/api-get-view-list-customer-details` | Yes |
| Customer | POST | `/api/customer/api-post-add-update-customer-details` | Yes |
| Project | POST | `/api/project/api-post-add-update-project` | Yes |

## Setup & Running Locally

### Installation

```bash
npm install
```

### Local Environment

Create your local environment configuration using the template:

```bash
cp .env.example .env
```

Then open `.env` and configure local database and JWT credentials.

Required `.env` keys:

```env
PORT=3103
DB_HOST=
DB_USER=
DB_PASS=
DB_NAME=DEV_CITY_SURVEY
JWT_SECRET=
```

### Run

To run in development mode with hot reload:

```bash
npm run dev
```

To run in production mode locally:

```bash
npm start
```

Swagger runs at `http://localhost:3103/api/api-docs` when using the local
`.env` port. Swagger uses the current browser host, so API calls stay on the
same port where the docs are opened.

If the terminal shows `EADDRINUSE`, another process is already using the
configured port. Stop that process or update `PORT` in `.env`.

## Swagger API Visibility

Swagger must show these City Survey tags and APIs in the browser:

- `Health`: `GET /health`
- `Auth`: `POST /api/auth/api-post-authenticate-user`
- `User`: `POST /api/user/api-post-add-update-user`
- `Customer`: `GET /api/customer/api-get-view-list-customer-details`
- `Customer`: `POST /api/customer/api-post-add-update-customer-details`
- `Project`: `POST /api/project/api-post-add-update-project`

If Swagger opens but an API is missing, restart `npm run dev` and hard refresh
the browser with `Ctrl + F5`.

## API Notes

### Authenticate User

`POST /api/auth/api-post-authenticate-user`

Calls:

```sql
CALL USP_POST_USER_AUTHENTICATE_ACTIVITY('AUTHENTICATE_USER', '[{"USER_NAME":"sai@yopmail.com","PASSWORD":"Abc@1234"}]', @ERRNO, @ERRMSG);
```

### Add or Update User

`POST /api/user/api-post-add-update-user`

Requires `Authorization: Bearer <token>`.

Calls:

```sql
CALL USP_POST_USER_PROFILE_ACTIVITY('ADD_UPDATE_USER', '[{"ITEM":"ADD_USER","USER_SYS_ID":0,"SYSTEM_ROLE_SYS_ID":1,"FIRST_NAME":"Sai","LAST_NAME":"Roy","GENDER":"Male","MOBILE_NO":"7894561230","EMAIL_ID":"sai@yopmail.com","ORGANISATION_SYS_ID":"1","PASSWORD":"Abc@1234","CREATED_BY":"1"}]', @ERRNO, @ERRMSG);
```

The route accepts a normal object body and wraps it as a one-item JSON array
before calling the stored procedure because the current database procedure
extracts fields using `$[0]`.

### Add or Update Customer Details

`POST /api/customer/api-post-add-update-customer-details`

Requires `Authorization: Bearer <token>`.

Calls:

```sql
CALL USP_POST_CUSTOMER_DETAILS_ACTIVITY('ADD_UPDATE_CUSTOMER', '{"ITEM":"ADD","CUSTOMER_TYPE":"Individual","CUSTOMER_NAME":"Ravi","BILLING_ADDRESS":"Kolkata","CREATED_BY":1,"PIC":[{"FULL_NAME":"Ranjan","CONTACT_NO":"7875585","EMAIL_ID":"ranjan@gmail.com","DEPARTMENT":"Back Office","DESIGNATION":"Employee"},{"FULL_NAME":"Manoj","CONTACT_NO":"7852479","EMAIL_ID":"manoj@gmail.com","DEPARTMENT":"Back Office","DESIGNATION":"Employee"}]}', @ERRNO, @ERRMSG);
```

This API accepts the object shape sent by the database developer. Running the
sample with a valid token may create customer and PIC records in the dev
database.

### View Customer List Details

`GET /api/customer/api-get-view-list-customer-details`

Requires `Authorization: Bearer <token>`.

Calls:

```sql
CALL USP_GET_LIST_CUSTOMER_ACTIVITY('VIEW_CUSTOMER', 'VIEW_ALL', @ERRNO, @ERRMSG);
```

Optional query parameter:

```text
ITEM=VIEW_ALL
```

If `ITEM` is not provided, the API defaults to `VIEW_ALL`.

### Add or Update Project

`POST /api/project/api-post-add-update-project`

Requires `Authorization: Bearer <token>`.

Calls:

```sql
CALL USP_POST_PROJECT_ACTIVITY('ADD_UPDATE_PROJECT', '{"ITEM":"ADD","CUSTOMER_SYS_ID":4,"PIC_SYS_ID":5,"SITE_ADDRESS":"Mumbai","ASSIGNED_SURVEYOR":"Marcus Koh","TYPE_OF_SURVEY":"MRT Pier","TYPE_OF_PROPERTY":"Own","CREATED_BY":1}', @ERRNO, @ERRMSG);
```

Running the full sample with a valid token may create project records in the
dev database.

## Git Branching & Deployment Strategy

This project follows a branch-based development and deployment model to ensure
environment segregation and robust release processes.

### Environments & Branch Mapping

| Branch | Target Environment | Deployment Trigger |
| :--- | :--- | :--- |
| `development` | **Development (Dev)** | Automatic on merge/push |
| `production` | **Production (Prod)** | Triggered on release |

### Environment Variables Policy

To prevent security leaks:

- **Strictly ignored:** Do not commit `.env`, `.env.development`,
  `.env.production`, or any real credential file matched in `.gitignore`.
- **Syncing templates:** Keep `.env.example` updated with placeholder values
  when adding new environment variables.
- **Secret injection:** Real Dev and Production credentials are managed through
  GitLab CI/CD variables. The runner injects the environment values at runtime.

### Step-by-Step Development Workflow

#### Step 1: Branch Off Development

Always create your branches from `development`:

```bash
git checkout development
git pull origin development
git checkout -b feature/your-feature
```

#### Step 2: Configure Local Environment

```bash
cp .env.example .env
# Open .env and configure local database and JWT credentials.
```

#### Step 3: Commit Changes

Ensure commit messages are semantic and lowercase:

- `feat`: new features, for example `feat: add project endpoint`
- `fix`: bug fixes, for example `fix: connection timeout`
- `refactor`: code optimizations or cleanups
- `docs`: documentation updates
- `chore`: dependencies and tooling configs

```bash
git add .
git commit -m "feat: add project endpoint"
```

#### Step 4: Push & Open a Merge Request

```bash
git push -u origin feature/your-feature-name
```

Open a Merge Request in GitLab targeting the `development` branch.

#### Step 5: Development Deployment

Once the MR is merged into `development`, the deployment pipeline automatically
triggers, building the app with development environment variables and deploying
it to the Dev server.

## Project Handoff Docs

Detailed backend and UI handoff documentation is available in `docs/`:

- [API URL Reference](./docs/API_URLS.md)
- [UI Developer Dev Server API Endpoint Sheet](./docs/API_ENDPOINTS_DEV_SERVER.md)
- [Documentation Index](./docs/INDEX.md)
- [Module Architecture and Scenario Flow](./docs/MODULE_ARCHITECTURE_FLOW.md)
- [Browser Demo and Demo Flow](./docs/BROWSER_DEMO_AND_DEMO_FLOW.md)
- [Dev Server Deployment Checklist](./docs/DEV_SERVER_DEPLOYMENT_CHECKLIST.md)
- [Run and Test Guide](./docs/RUN_AND_TEST_GUIDE.md)
- [Work Report and Backend Handoff KT](./docs/WORK_REPORT_AND_HANDOFF_KT_2026-07-08.md)
- [UI Developer Handoff KT](./docs/UI_DEVELOPER_HANDOFF_KT.md)
