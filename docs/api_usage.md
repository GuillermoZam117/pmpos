# API Usage Guide (with Examples)

This guide shows how to use current endpoints with query params and provides ready-to-run examples. It does not alter JSON Schemas, so it avoids `example` keywords in route definitions.

## Base
- Base URL: `http://localhost:3002`
- Auth header (protected routes): `Authorization: Bearer <JWT>`
- Swagger UI: `http://localhost:3002/docs` (paste token without the "Bearer " prefix in Authorize)

---

## Auth

Login (get JWT)
- cURL:
  curl -s -X POST http://localhost:3002/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"ChangeMe123!"}'
- PowerShell:
  Invoke-RestMethod -Method Post -Uri "http://localhost:3002/auth/login" -ContentType 'application/json' -Body '{"email":"admin@example.com","password":"ChangeMe123!"}'

Register (public)
- cURL:
  curl -s -X POST http://localhost:3002/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"user1@example.com","name":"User One","password":"Secret123!","branchIds":["00000000-0000-0000-0000-000000000000"]}'

Notes
- Keep JWT safe; pass it in the Authorization header on protected calls.

---

## Roles (protected: owner/admin)

List roles
- cURL:
  TOKEN="<paste_jwt_here>"; \
  curl -s http://localhost:3002/roles -H "Authorization: Bearer $TOKEN"

---

## Branches CRUD (protected: owner/admin)

List with pagination and search
- Query params:
  - `page` (default 1), `pageSize` (default 20, max 100)
  - `q` (search in code or name, case-insensitive)
- cURL examples:
  - Page 1, 10 per page:
    TOKEN="<paste_jwt_here>"; \
    curl -s "http://localhost:3002/settings/branches?page=1&pageSize=10" \
      -H "Authorization: Bearer $TOKEN"
  - Search "COL":
    TOKEN="<paste_jwt_here>"; \
    curl -s "http://localhost:3002/settings/branches?q=COL" \
      -H "Authorization: Bearer $TOKEN"

Create branch
- cURL:
  TOKEN="<paste_jwt_here>"; \
  curl -s -X POST http://localhost:3002/settings/branches \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"code":"COL-01","name":"Colima Centro","timezone":"America/Mexico_City"}'

Get by id
- cURL:
  TOKEN="<paste_jwt_here>"; ID="<branch_id>"; \
  curl -s "http://localhost:3002/settings/branches/$ID" \
    -H "Authorization: Bearer $TOKEN"

Update
- cURL:
  TOKEN="<paste_jwt_here>"; ID="<branch_id>"; \
  curl -s -X PUT "http://localhost:3002/settings/branches/$ID" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"name":"Colima Centro (Actualizado)"}'

Delete
- cURL:
  TOKEN="<paste_jwt_here>"; ID="<branch_id>"; \
  curl -s -X DELETE "http://localhost:3002/settings/branches/$ID" \
    -H "Authorization: Bearer $TOKEN"

---

## Users (protected: owner/admin)

List users (pagination, search, sort)
- Query params: `page` (default 1), `pageSize` (default 20, max 100), `q` (email/name contains), `sortBy=email|name|createdAt` (default createdAt), `sortDir=asc|desc` (default desc)
- cURL:
  TOKEN="<paste_jwt_here>"; \
  curl -s "http://localhost:3002/users?page=1&pageSize=20&q=adm&sortBy=email&sortDir=asc" -H "Authorization: Bearer $TOKEN"

Create user
- cURL:
  TOKEN="<paste_jwt_here>"; \
  curl -s -X POST http://localhost:3002/users \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"email":"user2@example.com","name":"User Two","password":"Secret123!","branchIds":["00000000-0000-0000-0000-000000000000"]}'

Get user by id
- cURL:
  TOKEN="<paste_jwt_here>"; ID="<user_id>"; \
  curl -s http://localhost:3002/users/$ID -H "Authorization: Bearer $TOKEN"

Update user
- cURL:
  TOKEN="<paste_jwt_here>"; ID="<user_id>"; \
  curl -s -X PUT http://localhost:3002/users/$ID \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"name":"User Two Updated"}'

Delete user
- cURL:
  TOKEN="<paste_jwt_here>"; ID="<user_id>"; \
  curl -s -X DELETE http://localhost:3002/users/$ID -H "Authorization: Bearer $TOKEN"

Notes
- User listing pagination/sorting is planned; current endpoint returns a flat array.

---

## Session Endpoints (planned)

The following endpoints are scheduled and will be added soon. Contracts below for early front-end integration; not active yet.

Refresh (planned)
- POST `/auth/refresh` → issues a new JWT using a httpOnly refresh cookie.
- Request: none (cookie-based)
- Response: `{ token: string }`

Logout (planned)
- POST `/auth/logout` → invalidates the refresh token (server-side) and clears cookie.
- Request: none
- Response: `{ ok: true }`

---

## Swagger Tips
- Use "Try it out" to send requests.
- Click "Authorize" and paste only the JWT (no "Bearer ").
- Check the Response body (not the Example Value) for real data.
