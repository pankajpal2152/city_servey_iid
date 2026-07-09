# City Survey Routes

Only these route files are active from `index.js`:

- `routes/auth.js`
- `routes/user.js`
- `routes/customer.js`
- `routes/project.js`
- `routes/health.js`

The older event, attendee, payment, file upload, and email route files are not
registered for the City Survey API scope.

Active endpoints:

- `GET /health`
- `POST /api/auth/api-post-authenticate-user`
- `POST /api/user/api-post-add-update-user`
- `GET /api/customer/api-get-view-list-customer-details`
- `POST /api/customer/api-post-add-update-customer-details`
- `POST /api/project/api-post-add-update-project`

Swagger for these active routes is available at `/api/api-docs` on the current
configured app port. Swagger should show `Health`, `Auth`, `User`, `Customer`,
and `Project` tags.
