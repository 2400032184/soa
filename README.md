# ResolveNow — Service Desk Frontend

React 19 + Vite frontend for **PS027: Enterprise Issue Escalation & Service Desk Management System**.

It talks to the Spring Cloud microservices stack (**Auth, Complaint, Assignment, Notification** services behind an **API Gateway** with **Eureka** discovery) through a single `/api` ingress, using **JWT** authentication and role-based access for three roles:

```
USER ──▶ raises complaint ──▶ ADMIN assigns department + staff ──▶ STAFF resolves ──▶ USER notified
```

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies every `/api/**` request to the API Gateway at `http://localhost:8080`
(see `vite.config.js`) — no CORS setup needed on the backend during development.
To point at a different gateway, set `VITE_API_URL` in a `.env` file:

```
VITE_API_URL=http://localhost:9000
```

### Demo mode (backend optional)

If the API Gateway is not reachable, the app automatically switches to **DEMO MODE** — a
localStorage-backed mock of all endpoints — so the entire UI can be demonstrated end-to-end
without running the Java services. A yellow `DEMO MODE` pill appears in the navbar while active.
Use **Reset demo data** on the login screen to restore the seed data.

## Demo accounts

| Role  | Email                   | Password   |
| ----- | ----------------------- | ---------- |
| USER  | user@resolvenow.com     | user123    |
| ADMIN | admin@resolvenow.com    | admin123   |
| STAFF | ravi@resolvenow.com     | staff123   |
| STAFF | meena@resolvenow.com    | staff123   |
| STAFF | arjun@resolvenow.com    | staff123   |

New customers can self-register (`/register`). Admins create additional STAFF accounts from
**Staff & Users → Add Staff Member**.

## Screens by role

| Role  | Pages                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------- |
| USER  | Dashboard (stats + recent tickets + alerts), New Complaint, My Complaints (+ filters), Ticket detail with lifecycle timeline |
| ADMIN | Dashboard (KPIs + department workload bars), All Complaints (filter/search), Ticket detail with **Assign / Reassign / Update status**, Staff & Users management |
| STAFF | Dashboard (work queue KPIs), My Assignments (+ status filter), Ticket detail with status update & resolution note |
| All   | Landing page, Login, Register, Notifications feed with unread badge in navbar                    |

## Backend API contract

All requests go through the gateway with header `Authorization: Bearer <jwt>`.

### Auth Service — `/api/auth`

| Method | Path       | Body                              | Response                     |
| ------ | ---------- | --------------------------------- | ---------------------------- |
| POST   | `/login`   | `{ email, password }`             | `{ token, user:{id,name,email,role} }` |
| POST   | `/register`| `{ name, email, password, role }` | `{ token, user }`            |

### Complaint Service — `/api/complaints`

| Method | Path      | Body / Notes                                                        |
| ------ | --------- | ------------------------------------------------------------------- |
| POST   | `/`       | `{ title, description, category, priority }` → complaint            |
| GET    | `/my`     | complaints of the JWT user                                          |
| GET    | `/`       | all complaints (ADMIN/STAFF)                                        |
| GET    | `/{id}`   | one complaint                                                       |

Complaint: `{ id, title, description, category, priority, status, createdBy:{id,name,email}, createdAt, updatedAt }`
Statuses: `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`; priorities `LOW/MEDIUM/HIGH/CRITICAL`.

### Assignment Service — `/api/assignments`

| Method | Path                      | Body / Notes                                                          |
| ------ | ------------------------- | --------------------------------------------------------------------- |
| POST   | `/`                       | `{ complaintId, department, staffId, note }` → assignment (notifies customer + staff) |
| GET    | `/complaint/{complaintId}`| latest assignment for a complaint                                     |
| GET    | `/staff/{staffId}`        | assignments for a staff member (embed or join complaint)              |
| PUT    | `/{assignmentId}/status`  | `{ status, resolutionNote }` (note required when RESOLVED/CLOSED; notifies customer) |

Assignment: `{ id, complaintId, department, staffId, staffName, note, assignedBy, assignedAt, status, resolutionNote, updatedAt }`.

### Notification Service — `/api/notifications`

| Method | Path              | Response                                  |
| ------ | ----------------- | ----------------------------------------- |
| GET    | `/my`             | `[ { id, message, type, read, complaintId, createdAt } ]` |
| GET    | `/unread-count`   | number or `{ count }`                     |
| PUT    | `/{id}/read`      | mark one read                             |
| PUT    | `/read-all`       | mark all read                             |

### Users (Admin) — `/api/users`

| Method | Path          | Body / Notes                                    |
| ------ | ------------- | ----------------------------------------------- |
| GET    | `/?role=STAFF`| list users (optionally filtered by role)        |
| POST   | `/staff`      | `{ name, email, password, department }`         |

> The service layer (`src/services/*`) normalizes common response variants
> (`content[]`, `data[]`, embedded objects), so minor backend shape differences are tolerated.

## Project structure

```
src/
├── api/
│   ├── client.js          # axios instance + JWT interceptor + error helpers
│   ├── demoMode.js        # global demo-mode flag (backend-down fallback)
│   ├── fallback.js        # withFallback(realCall, mockCall)
│   └── mockApi.js         # localStorage mock of every endpoint (seed data)
├── components/            # Navbar/AppLayout, ProtectedRoute, badges, Modal,
│                          # Timeline, ComplaintSummary, StatCard, icons…
├── context/               # AuthContext (JWT session), ToastContext
├── hooks/useDemoMode.js
├── pages/
│   ├── LandingPage / LoginPage / RegisterPage / Notifications
│   ├── user/              # UserDashboard, NewComplaint, MyComplaints, detail
│   ├── admin/             # AdminDashboard, AdminComplaints, detail+assign, StaffManagement
│   └── staff/             # StaffDashboard, StaffAssignments, detail+status update
├── services/              # auth / complaint / assignment / notification / user clients
├── utils/                 # formatting, event bus, nav helpers, timeline builder
├── App.jsx                # router (role-guarded route trees)
└── index.css              # design system (no UI framework)
```

## Scripts

```bash
npm run dev      # Vite dev server (proxies /api → :8080)
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run lint     # ESLint