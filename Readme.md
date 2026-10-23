# Orbit

Orbit is a collaborative project management workspace for Neostats teams. It is a focused command center for projects, tasks, team access, and day-to-day delivery.

## What is included

- Responsive workspace dashboard with project health, activity, and task views
- Projects grid with progress, due dates, health indicators, and quick project creation
- Task table with search, status changes, priorities, assignees, and comments count
- Team directory with workspace roles and invite flow
- Express/MongoDB API for projects, tasks, and comments
- Server-side role checks for admin, manager, member, and viewer actions
- Signed login sessions with role-derived authorization; client headers cannot impersonate a role
- Optimistic concurrency for tasks using `if-match-version` or a submitted `version`; stale edits return `409`
- Paginated project reads and explicit validation/error responses

## Run locally

1. Install dependencies with `npm run install:all`.
2. Set `MONGO_URL` in `backend/.env` to your MongoDB Atlas or local MongoDB connection string.
3. Start both applications with `npm run dev`.
4. Open `http://localhost:3000`.

The frontend runs on `http://localhost:3000` and the API runs on `http://localhost:5000`.
If you open the frontend through a LAN address such as `http://192.168.x.x:3000` or `:3001`, the browser automatically targets the API on the same host at port `5000`.

Open `http://localhost:3000/login` to create an account or sign in. The first registered account becomes the workspace admin; later accounts default to team members. Set a strong `AUTH_SECRET` in `backend/.env` before sharing the application.

### If MongoDB Atlas cannot connect

The API can start in demo mode when Atlas is unavailable, but persistent project data requires a successful connection:

1. In Atlas, open **Security > Network Access** and add the public IP of the machine running the backend. For local-only testing, Atlas also provides an `0.0.0.0/0` option, but a specific IP is safer.
2. In **Database Access**, confirm the database user is active and its password is correct.
3. Set `backend/.env` with the complete URI, for example:

   ```env
   MONGO_URL=mongodb+srv://<username>:<password>@<cluster-host>/<database>?retryWrites=true&w=majority
   ```

   URL-encode special characters in the username or password (`@`, `:`, `/`, `#`, and `%`).
4. Restart the backend after changing Atlas access or `.env`. Atlas IP changes can take a short time to take effect.

## API notes

The API expects an authenticated identity to be supplied by the future auth layer. During development, role-protected routes accept `x-user-role` and comment creation also requires a valid `x-user-id`. The current UI uses local state for an immediate, polished preview; the API is ready to be connected to the auth/session and query layer.

Key routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/projects?page=1&limit=20`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks`
- `PATCH /api/tasks/:id` with `if-match-version`
- `DELETE /api/tasks/:id`
- `GET|POST /api/tasks/:taskId/comments`
- `DELETE /api/comments/:id`
