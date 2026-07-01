<div align="center">
  <img src="public/aadhcode-logo.webp" alt="Aadhcode" width="160" />
  <h3>AadhCode Solutions Pvt. Ltd.</h3>
  <p>Internal HR Portal — Confidential, For Internal Use Only</p>
  <p><strong>Live:</strong> <a href="https://portal.aadhcode.com">portal.aadhcode.com</a></p>
</div>

---

## Overview

This is the internal HR portal built for AadhCode Solutions. It covers the day-to-day HR operations — leave requests, employee onboarding, equipment allocation, policy acknowledgments, and employee profile management — all in one place.

The system is role-based. Admins have full control over employee records. HR can manage leaves and onboarding. IT handles equipment requests. Employees can view their own profile, apply for leave, and access company documents.

## Features

- **Employee Login** — Employees sign in using their employee code and date of birth. No passwords to remember.
- **Leave Management** — Employees apply for leave, HR/admin approves or rejects, and email notifications go out automatically at each step.
- **Employee Handbook** — The full company handbook is available inside the portal with acknowledgment tracking so HR knows who has read it.
- **Policies** — Company policies are listed and accessible to all employees.
- **Equipment Requests** — Employees raise hardware or software requests which are routed directly to IT.
- **Onboarding** — A 10-step onboarding checklist for new hires. HR and admin can trigger and track progress.
- **Profile Management** — Employees can update their contact details, emergency information, and upload documents. Admins can edit all fields including designation, department, role, and employment status.
- **Employee Directory** — Accessible to admin and HR only. Full profile view for every employee including documents and assigned equipment.
- **Activity Log** — Admin and HR can view and clear the activity log.

## Tech Stack

- **Framework** — Next.js 15 (App Router)
- **Database & Auth** — Supabase
- **Styling** — Tailwind CSS with Shadcn UI components
- **Email** — Resend
- **Language** — TypeScript throughout

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Resend account for email notifications

### Installation

```bash
git clone https://github.com/rikhinagra/hr-portal.git
cd hr-portal
npm install
```

### Environment Variables

Create a `.env.local` file in the root with the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Seeding the Database

```bash
npm run seed
```

This creates the initial employee records and sets up the required tables.

## Project Structure

```
app/
  api/          — All API routes (auth, leave, profile, documents, equipment, onboarding)
  dashboard/    — Protected dashboard pages
  login/        — Login page
components/     — Shared UI components and layout
lib/            — Supabase clients, auth helpers, email wrappers
types/          — TypeScript types shared across the project
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed the database with initial data |

## Roles

| Role | Access |
|---|---|
| Admin | Full access — can edit all employee fields, manage everything |
| HR | Leave approvals, onboarding, employee directory |
| IT | Equipment request management |
| Employee | Own profile, leave, handbook, policies, equipment requests |

## Deployment

The project is designed to deploy on Vercel. Connect the repository, add the environment variables in the Vercel project settings, and deploy.
