# City Survey Routes

Only these route files are active from `index.js`:

- `routes/auth.js`
- `routes/user.js`

The older event, attendee, payment, file upload, and email route files are not
registered for the City Survey API scope.

Active endpoints:

- `POST /api/auth/api-post-authenticate-user`
- `POST /api/user/api-post-add-update-user`

Swagger for these active routes is available at `/api/api-docs` on the current
configured app port.
