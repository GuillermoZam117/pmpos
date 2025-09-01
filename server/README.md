PMPOS Read-Service (prototype)

Run locally (install deps and set env vars):

```powershell
cd server
npm install
$env:INTERNAL_API_KEY = 'local-test-key'
$env:DB_CONN = 'Server=localhost\\sambapos22;Database=SambaPOS5;User Id=readonly;Password=changeme;TrustServerCertificate=true;'
node index.js
```

The service exposes:
- GET /internal-api/active-tickets  (requires header x-internal-api-key)
- GET /internal-api/tickets/:id/details  (requires header x-internal-api-key)

Do NOT commit real credentials. Use `.env` or a secret manager in CI/production.
