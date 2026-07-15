# City Survey Routes

Only these route files are active from `index.js`:

- `routes/auth.js`
- `routes/user.js`
- `routes/customer.js`
- `routes/project.js`
- `routes/master.js`
- `routes/health.js`

The older event, attendee, payment, file upload, and email route files are not
registered for the City Survey API scope. Active master data APIs are in
`routes/master.js`.

Active endpoints:

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

Swagger for these active routes is available at `/api/api-docs` on the current
configured app port. Swagger should show `Health`, `Auth`, `User`, `Customer`,
`Project`, and `Master` tags.
