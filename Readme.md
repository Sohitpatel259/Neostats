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
- The authenticated workspace hydrates from MongoDB and does not silently replace failed database reads with demo records
- Optimistic concurrency for tasks using `if-match-version` or a submitted `version`; stale edits return `409`
- Paginated project reads and explicit validation/error responses

## Run locally

1. Install dependencies with `npm run install:all`.
2. Set `MONGO_URL` in `backend/.env` to your MongoDB Atlas or local MongoDB connection string.
3. Set `MONGO_DB_NAME=neostats` so the API always writes to the database you expect in Atlas.
4. Start both applications with `npm run dev`.
5. Open `http://localhost:3000`.

The frontend runs on `http://localhost:3000` and the API runs on `http://localhost:5000`.
If you open the frontend through a LAN address such as `http://192.168.x.x:3000` or `:3001`, the browser automatically targets the API on the same host at port `5000`.

After signing in, project, task, and user changes are sent to the API first. The UI updates only after MongoDB confirms the operation; task updates also keep the server-returned version for the next optimistic-concurrency update. If a read fails, the workspace shows an error and an empty state instead of presenting unsaved demo records.

Verify the exact Atlas database receiving data at `GET /api/health`. It returns `databaseName` and `host`. Collections are created by MongoDB after the first successful insert, so registering the first account creates the `users` collection; creating projects, tasks, and comments creates their corresponding collections.

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

Protected API routes require a signed bearer token from the authentication endpoints. The backend loads the active user from MongoDB and enforces workspace roles, project membership, and task access server-side.

Key routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/projects?page=1&limit=20`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `PATCH /api/projects/:id/archive`
- `DELETE /api/projects/:id`
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/members`
- `PATCH /api/projects/:projectId/members/:userId`
- `DELETE /api/projects/:projectId/members/:userId`
- `GET /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id` with `if-match-version`
- `DELETE /api/tasks/:id`
- `GET|POST /api/tasks/:taskId/comments?page=1&limit=50`
- `DELETE /api/comments/:id`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

Archiving is a persistent project state, not a deletion. Authorized admins and assigned project managers can call `PATCH /api/projects/:id/archive`; MongoDB stores `status: "archived"` and an `archivedAt` timestamp. Archived projects are excluded from the active project list, shown in the Archive workspace, and can be restored with `PATCH /api/projects/:id` and `{ "status": "on_track" }`.

Team Members receive only projects they belong to and only tasks assigned to them. They can update their assigned tasks, change task status, read task comments, and add comments. The API rejects attempts to access another member's task or reassign a task as a Team Member.

Viewers have read-only access to their permitted projects and the tasks within those projects. The API rejects task updates, task deletion, project changes, member changes, and comment creation for viewers, while the frontend hides all write controls and keeps task details and comments available for review.

Comments are stored in MongoDB with their task and author relationships. Team Members can create comments on tasks assigned to them, all users with task access can read comments, and authors can delete their own comments. Admins and Project Managers can delete comments within projects they can access. Invalid, unauthorized, and missing comment operations return explicit `400`, `403`, or `404` responses.

The Calendar workspace is backed by task `dueDate` values stored in MongoDB. It provides month navigation, a deadline grid, and an agenda view; managers can set a due date while creating a task.

Calendar events are also persisted in MongoDB through `POST /api/events` and loaded with `GET /api/events`. Admins and Project Managers can create workspace or project-linked events; all users can view events for projects they can access.
