# TaskManager Backend — Symfony

## Stack
- PHP 8.2+
- Symfony 7.4
- Doctrine ORM + MariaDB/MySQL
- JWT + refresh tokens
- Nelmio CORS

## 1. Installation

From `TaskManager-back`:

```bash
composer install
```

Check PHP:

```bash
php -v
```

## 2. Database

### Option A — Laragon / local MariaDB
Create a database named `taskmanager`, then keep:

```dotenv
DATABASE_URL="mysql://root:@127.0.0.1:3306/taskmanager?serverVersion=10.4.32-MariaDB&charset=utf8mb4"
```

If your MySQL/MariaDB password is not empty, put the real value in `.env.local`.

### Option B — Docker
Run:

```bash
docker compose up -d
```

The included compose file starts MariaDB on `127.0.0.1:3306`.

## 3. JWT keys

The repository intentionally does not contain private JWT keys.

Run once:

```bash
php bin/console lexik:jwt:generate-keypair
```

If prompted for a passphrase, use the value from `JWT_PASSPHRASE`.

## 4. Database schema

Check migrations:

```bash
php bin/console doctrine:migrations:status
```

Apply them:

```bash
php bin/console doctrine:migrations:migrate --no-interaction
```

Validate Doctrine mapping:

```bash
php bin/console doctrine:schema:validate
```

## 5. Clear cache and start the API

```bash
php bin/console cache:clear
php -S 127.0.0.1:8000 -t public public/index.php
```

Keep this terminal open.

## 6. Verify that the backend is really running

### A. Health check — no authentication required

Open:

`http://127.0.0.1:8000/api/health`

Expected:

```json
{"status":"ok","database":"up"}
```

A `503` with `database: down` means Symfony is running but the database connection is failing.

### B. Verify routes

```bash
php bin/console debug:router
```

You should see routes such as:
- `api_health`
- `api_login_check`
- `api_register`
- `api_me`
- `api_projects_list`
- `api_projects_create`
- project workflow/team routes

### C. Test registration

PowerShell:

```powershell
$body = @{
  name = "Test Client"
  email = "test@example.com"
  password = "Test1234!"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected: HTTP `201` and JSON containing `id`, `email`, `name`, `token`, and `refresh_token`.

### D. Test login

```powershell
$body = @{
  email = "test@example.com"
  password = "Test1234!"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/login_check" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Expected: HTTP `200` with a JWT token.

### E. Test authenticated endpoint

Copy the returned token and run:

```powershell
$headers = @{
  Authorization = "Bearer YOUR_TOKEN"
}

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/me" `
  -Method Get `
  -Headers $headers
```

Expected: the connected user's profile.

### F. Test projects

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/projects" `
  -Method Get `
  -Headers $headers
```

Expected: HTTP `200` with a JSON array.

## 7. Frontend

The frontend currently targets:

`http://localhost:8000`

So start the Symfony backend on port `8000` and then start the Next.js frontend in its own directory with:

```bash
npm install
npm run dev
```

Open the frontend at the URL displayed by Next.js.

## 8. Important development security notes

- Never commit real SMTP passwords, JWT private keys, or production credentials.
- Put local secrets in `.env.local`.
- The development mailer is set to `null://null`; configure a real SMTP DSN locally if password-reset emails must actually be sent.
- JWT key files are ignored by Git and must be generated locally.
