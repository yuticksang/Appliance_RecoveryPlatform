# EasyRecovery

EasyRecovery is a full-stack appliance recovery and trade-in platform. Sellers
submit used household appliances for condition assessment and valuation, buyers
manage recovered inventory and markdowns, and administrators oversee users,
catalogue data, scoring rules, transactions, packaging instructions, and
reports.

The platform supports the recovery workflow from an appliance questionnaire and
photo upload through offer review, pickup, transaction tracking, recovery-slip
generation, and reporting.

## Features

### Sellers

- Register, verify an email address, sign in, and recover an account.
- Maintain profile, pickup-address, and bank information.
- Submit washing machines, refrigerators, microwaves, and air conditioners for
  recovery.
- Complete category-specific condition questionnaires and upload condition
  photos.
- Receive calculated valuations and packaging instructions.
- Track transactions, item statuses, notifications, and recovery slips.

### Buyers

- View a dashboard of recovered appliances.
- Browse appliance and transaction records.
- Review condition markdown information.

### Administrators

- Manage administrators, sellers, buyers, appliances, categories, and brands.
- Configure condition groups, condition options, scoring weights, and price
  markdowns.
- Review submissions and manage transaction progress.
- Maintain category-specific packaging instructions.
- Generate transaction and summary reports with charts and downloadable output.
- Run scheduled cancellation checks for expired transactions.

## Technology stack

### Frontend

- Angular 20 with standalone components
- Angular Material, Bootstrap, and Bootstrap Icons
- RxJS
- Chart.js and ng2-charts
- jsPDF and html2canvas

### Backend

- Node.js and TypeScript
- Express 5
- PostgreSQL hosted on Supabase
- JWT authentication and bcrypt password hashing
- Supabase Storage for review/condition photos
- Nodemailer for verification and password-reset email
- Google Identity Services
- Multer, Helmet, CORS, Morgan, and node-cron

## Architecture

```text
Angular SPA (localhost:4200)
        |
        | HTTP / JSON + JWT
        v
Express API (localhost:3000)
        |
        +-- PostgreSQL / Supabase
        +-- Supabase Storage
        +-- SMTP email provider
        +-- Google identity verification
```

## Project structure

```text
EasyRecovery/
├── src/                         # Angular application
│   ├── app/components/          # Seller, buyer, and admin screens
│   ├── app/services/            # API and application services
│   ├── app/shared/              # Layout, alert, and breadcrumb components
│   ├── auth/                    # Route guards and authentication helpers
│   └── environments/            # Frontend API/Supabase configuration
├── backend/
│   ├── src/controllers/         # API business logic
│   ├── src/routes/              # Express route definitions
│   ├── src/middleware/          # JWT authentication and uploads
│   ├── src/config/              # PostgreSQL connection
│   ├── src/scripts/             # Supabase Storage setup
│   └── src/utils/               # Email service
├── final_erd_schema.sql         # Complete PostgreSQL schema and seed account
├── angular.json
└── package.json
```

## Prerequisites

- Node.js 20 or newer
- npm
- A Supabase project or compatible PostgreSQL database
- SMTP credentials if email verification and password reset are required
- A Google OAuth client ID if Google sign-in is required

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/yuticksang/EasyRecovery.git
cd EasyRecovery
```

### 2. Install dependencies

Install the frontend and backend packages separately:

```bash
npm install
cd backend
npm install
cd ..
```

### 3. Create the database

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `final_erd_schema.sql`.

> **Warning:** the schema script drops and recreates existing EasyRecovery
> tables. Do not run it against a database containing data you need to retain.

The schema creates the user, appliance, condition, questionnaire, transaction,
pickup, notification, recovery-slip, reporting, and buyer-inventory tables. It
also creates a local demonstration super-administrator account. Change the
seeded password immediately outside a disposable development environment.

### 4. Configure the backend

Create `backend/.env`:

```dotenv
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200

# PostgreSQL / Supabase
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
JWT_SECRET=replace_with_a_long_random_secret
BCRYPT_SALT_ROUNDS=12
GOOGLE_CLIENT_ID=your_google_oauth_client_id

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_app_password
SMTP_FROM_NAME=EasyRecovery
```

Never commit `backend/.env`, database credentials, JWT secrets, SMTP passwords,
or the Supabase service-role key. The Supabase anonymous key is intended for
client use, but access must still be restricted by appropriate database and
storage policies.

### 5. Configure the frontend

For local development, update `src/environments/environment.ts` when necessary:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  supabase: {
    url: 'https://YOUR_PROJECT.supabase.co',
    anonKey: 'your_anon_key'
  }
};
```

For deployment, set `apiUrl` in `environment.prod.ts` to the deployed Express
API URL, not the Supabase project URL unless a compatible API is hosted there.

Google sign-in also requires the browser client ID in the login component and
`GOOGLE_CLIENT_ID` in `backend/.env` to refer to the same OAuth client.

### 6. Configure Supabase Storage

The backend includes a script that creates the public
`admin-review-photos` bucket with image type and size restrictions:

```bash
cd backend
npx ts-node src/scripts/setup-storage.ts
```

This step requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in
`backend/.env`.

### 7. Start the application

Run the backend from one terminal:

```bash
cd backend
npm run dev
```

Run the Angular application from another terminal at the repository root:

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200). The API health endpoint is
available at [http://localhost:3000/health](http://localhost:3000/health).

## Available commands

### Frontend

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Angular development server. |
| `npm run build` | Create a production frontend build under `dist/`. |
| `npm run watch` | Rebuild continuously with the development configuration. |
| `npm test` | Run Angular unit tests with Karma/Jasmine. |

### Backend

Run these commands from `backend/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with nodemon and ts-node. |
| `npm run build` | Compile TypeScript to `backend/dist/`. |
| `npm start` | Start the compiled API. |
| `npm run clean` | Remove compiled backend output. |

## Main API groups

- `/api/auth` — registration, login, verification, password reset, and Google
  authentication
- `/api/admin` — administrative users and appliance configuration
- `/api/buyer` — buyer inventory and markdown data
- `/api/transactions` — recovery submissions and transaction lifecycle
- `/api/scoring-config` — valuation weights and scoring configuration
- `/api/notifications` — seller notifications
- `/api/dashboard` and `/api/buyerDashboard` — dashboard data
- `/api/transactionReport` and `/api/summaryReport` — reporting
- `/health` — API health check

## Security notes

- Keep service-role, database, JWT, and SMTP credentials server-side.
- Change or remove demonstration credentials created by the SQL script.
- Configure production CORS origins instead of relying on localhost settings.
- Review Supabase row-level security and storage policies before deployment.
- Store uploaded files in managed object storage and validate MIME type and size.
- Use HTTPS for deployed frontend and API services.

## Known limitations and future improvements

- Several frontend services still contain hardcoded localhost API URLs and
  should use the shared environment configuration consistently.
- Production API and CORS URLs should be made environment-driven.
- Add package lockfiles for reproducible dependency installation.
- Add integration and end-to-end tests for each role and transaction state.
- Add automated database migrations rather than relying on a destructive schema
  bootstrap script.
- Add CI checks for frontend tests, backend compilation, and secret scanning.

## Disclaimer

EasyRecovery is an educational and portfolio project. Validate its security,
data-retention, and operational controls before using it with production users
or financial transactions.
