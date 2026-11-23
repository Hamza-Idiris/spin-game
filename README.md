# SPIN — One Platform. Every Random Possibility.

<div align="center">

[![React](https://img.shields.io/badge/React-18.3-blue.svg?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_RLS-3ECF8E.svg?logo=supabase)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Tests-48%20Passing-brightgreen.svg?logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**A high-performance, cryptographically fair randomization and decision-making platform built for teams, classrooms, events, and tournaments.**

[Key Features](#-key-features) • [Installation & Setup](#-installation--setup) • [Fairness Engine](#-cryptographic-fairness-engine) • [Tech Stack](#-tech-stack) • [Documentation](#-documentation)

---

</div>

## 📌 Overview

**SPIN** is a full-featured web application offering a modern suite of randomization utilities: interactive SVG wheels, competitive match pairings, and balanced group allocations. Designed with an emphasis on **mathematical fairness**, **dual-mode persistence (cloud + local-first offline)**, and an enterprise-grade **Admin Dashboard**.

Whether used offline in a local classroom or scaled in the cloud with Supabase authentication and PostgreSQL Row-Level Security, SPIN ensures complete reproducibility, auditability, and zero statistical bias.

---

## ✨ Key Features

### 1. 🎡 Random Wheel
* **Dynamic SVG Rendering**: Smooth, high-framerate rotational physics and visual indicators.
* **Multi-Winner Draws**: Select single or sequential winners in one spin cycle.
* **Winner Management**: Option to automatically remove winning entries or retain them for subsequent rounds.
* **Audio & Visual Effects**: Toggleable sound effects, celebratory confetti animations, and distraction-free fullscreen presentation mode.
* **Input Flexibility**: Quick paste, comma/newline delimiters, and real-time slice color assignments.

### 2. ⚔️ Team Matching
* **Flexible Tournament Pairings**: Generate 1-on-1 duels or N-way multiplayer matchups.
* **Automated BYE Handling**: Intelligently handles odd participant counts with explicit BYE allocations.
* **Staged Reveals**: Choose between dramatic one-by-one reveals or an instant overview of all matchups.
* **Editable Matchups**: Easily adjust names, re-roll individual matches, or re-randomize pairings on the fly.

### 3. 👥 Group Generator
* **Dual Distribution Modes**:
  * **By Size**: Divide a roster into groups of a specific target size.
  * **By Count**: Split participants into a fixed number of evenly balanced groups.
* **Equal Distribution Algorithm**: Distributes remainder participants uniformly so group sizes never differ by more than 1.
* **Bulk Data Cleaning**: Built-in CSV / multi-line parser with automatic whitespace trimming and duplicate detection with instant user feedback.

### 4. 🛡️ Cryptographically Fair Randomization
* **Zero Modulo Bias**: Uses rejection sampling over a 32-bit Cryptographically Secure Pseudo-Random Number Generator (`crypto.getRandomValues`).
* **Fisher–Yates Shuffle**: Guaranteed uniform $O(N)$ permutation without statistical clustering.
* **Dual Execution Model**:
  * **Server-Verified**: When connected to Supabase, outcomes are computed in isolated Edge Functions, immutably recorded in PostgreSQL, and streamed back to the client. The wheel animation mirrors the server decision.
  * **Offline Fallback**: If the server is unreachable or unconfigured, the identical WebCrypto engine runs client-side, flagging records as *Saved locally*.

### 5. 📊 Comprehensive Admin Suite
* **Live Activity Feed**: Real-time stream of spins, team matches, and group generations across the organization.
* **Audit & Session Logs**: Full historical trail of inputs, parameters, and generated outputs.
* **Visual Analytics**: Interactive metrics and charts powered by Recharts (activity distribution, daily volume, peak usage).
* **Logical Backups & Restore**: In-app encrypted SQL dump generation and restore utility with configurable data retention rules.
* **System Settings**: Granular participant limits, default animations, and feature-flag controls.

### 6. 📑 Multi-Format Data Export
* **Excel (.xlsx)**: Formatted workbooks generated client-side via ExcelJS with metadata headers and structured tables.
* **PDF (.pdf)**: Clean, publication-ready documents generated with jsPDF & AutoTable.
* **Direct Clipboard & Print**: Quick CSV/plaintext copying and dedicated CSS print stylesheets.

### 7. 🌐 Localization & Theming
* **Multi-Language Support**: Complete internationalization (`i18next`) supporting **English** and **Somali (Af-Soomaali)**.
* **Adaptive Theme Engine**: Seamless Light and Dark modes with persistent user preference storage and zero-flash transitions.

---

## 🚀 Installation & Setup

### Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
* **npm** (bundled with Node) or **pnpm** / **yarn**
* *(Optional)* **Supabase CLI** and **Docker** (if running a local Supabase database instance)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/spin-platform.git
cd spin-platform
```

---

### Step 2: Install Dependencies

Navigate to the `frontend/` directory and install the required npm packages:

```bash
cd frontend
npm install
```

---

### Step 3: Run in Local / Offline Mode (Zero Configuration)

SPIN works right out of the box without needing any external database or cloud credentials. In this mode, results and sessions are safely stored in browser `localStorage`.

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

> **Note**: In local mode, the Admin dashboard will simply display *“Supabase is not configured”*. All core randomization tools (Wheel, Teams, Groups) remain 100% functional.

---

### Step 4: Configure Supabase (Optional — for Cloud Sync & Admin)

To enable cloud persistence, server-side verified randomization, user authentication, and full Admin capabilities:

1. **Create a Supabase Project**: Set up a free project on [supabase.com](https://supabase.com).
2. **Apply Database Migrations**:
   Run the SQL scripts located in `supabase/migrations/` using the Supabase SQL Editor or the Supabase CLI:
   ```bash
   supabase db push
   ```
3. **Configure Environment Variables**:
   Copy the sample environment file to the frontend root:
   ```bash
   cp ../.env.example .env
   ```
4. **Update `.env`**:
   Fill in your public Supabase API credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
5. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy spin-submit
   supabase functions deploy backup-export
   ```
6. **Restart Development Server**:
   ```bash
   npm run dev
   ```

For detailed cloud deployment steps, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## ⚙️ Environment Variables Reference

| Variable | Location | Scope | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `frontend/.env` | Client-side (Public) | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `frontend/.env` | Client-side (Public) | Supabase anonymous public API key |
| `ALLOWED_ORIGINS` | Supabase Secrets | Server-side (Edge) | Comma-separated allowed frontend origins |
| `CRON_SECRET` | Supabase Secrets / Vault | Server-side (Edge) | Secret token for scheduled maintenance jobs |
| `BACKUP_ENCRYPTION_KEY` | Supabase Secrets | Server-side (Edge) | 32-byte base64 key for encrypting backups |
| `RESEND_API_KEY` | Supabase Secrets | Server-side (Edge) | *(Optional)* Resend API key for alerts |

---

## 📐 Cryptographic Fairness Engine

Most web randomizers rely on JavaScript's standard `Math.random() % N`. This introduces two fundamental flaws:
1. **Predictability**: `Math.random()` uses pseudo-random algorithms (e.g., xoshiro128**) not designed for cryptographic integrity.
2. **Modulo Bias**: When dividing a 32-bit random space ($2^{32}$) by an arbitrary list size $N$, lower numbers have an inherently higher probability of selection unless $2^{32}$ is an exact multiple of $N$.

### How SPIN Solves This

SPIN eliminates both issues in `supabase/functions/_shared/engine.ts`:

```typescript
export function secureInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0) throw new Error('max must be a positive integer');
  if (max === 1) return 0;
  
  const range = 0x100000000;              // 2^32
  const limit = range - (range % max);    // Largest multiple of max <= 2^32
  const buf = new Uint32Array(1);

  // Discard numbers in the biased remainder zone
  do { 
    globalThis.crypto.getRandomValues(buf); 
  } while (buf[0] >= limit);

  return buf[0] % max;
}
```

* **True CSPRNG**: Sourced via OS entropy through `crypto.getRandomValues()`.
* **Rejection Sampling**: Eliminates modulo bias by redrawing any values falling into the remainder tail.
* **Fisher–Yates Shuffle**: All array operations run in uniform $O(N)$ without index distortion.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript 5.5, Vite 5.4 |
| **Styling & Icons** | Tailwind CSS 3.4, Lucide React |
| **Forms & Validation** | React Hook Form, Zod |
| **Charts & Visualization** | Recharts |
| **Internationalization** | i18next, react-i18next (English & Somali) |
| **Document Generation** | ExcelJS (XLSX), jsPDF + jsPDF-AutoTable (PDF) |
| **Backend & Database** | Supabase, PostgreSQL 16 (Row-Level Security), Deno Edge Functions |
| **Testing** | Vitest, JSDOM |

---

## 📂 Project Directory Structure

```plaintext
spin-platform/
├── docs/                       # Architecture & operational guides
│   ├── API.md                  # Edge Functions API specifications
│   ├── BACKUP.md               # Logical backup & restore documentation
│   ├── DATABASE.md             # Schema, RLS policies, and testing
│   └── DEPLOYMENT.md           # Production deployment playbook
├── frontend/                   # Client application
│   ├── src/
│   │   ├── components/         # Shared UI components (Modals, Buttons, Nav)
│   │   ├── features/           # Domain features (wheel, teams, groups, etc.)
│   │   ├── hooks/              # Custom React hooks (theme, history, i18n)
│   │   ├── layouts/            # Public & Admin layout wrappers
│   │   ├── lib/                # Shared utilities & export formatters
│   │   ├── locales/            # Translation catalogs (en, so)
│   │   ├── pages/              # Top-level page routes (public & admin)
│   │   └── types/              # TypeScript interfaces and schema types
│   ├── package.json            # Frontend dependencies & scripts
│   └── vite.config.ts          # Vite build configuration
├── scripts/                    # Automation & CI scripts
│   ├── sync-shared.sh          # Synchronizes engine logic between backend & frontend
│   └── test-db.sh              # Local scratch PostgreSQL integration tests
├── supabase/                   # Supabase backend definitions
│   ├── functions/              # Deno Edge Functions (spin-submit, backup, etc.)
│   └── migrations/             # SQL migrations with RLS policies
├── .env.example                # Template for environment configuration
└── README.md                   # Project documentation
```

---

## 🧪 Testing & Quality Assurance

SPIN comes with a comprehensive test suite covering mathematical uniqueness, distribution uniformity, edge cases, session storage, and internationalization.

### Run Frontend Unit & Integration Tests

```bash
cd frontend
npm test
```

### Run Type Checking

```bash
cd frontend
npm run typecheck
```

### Run Database & RLS Tests

To execute RLS and schema validation tests against a scratch PostgreSQL instance:

```bash
./scripts/test-db.sh
```

---

## 📖 Documentation

* 📘 [Deployment Guide (docs/DEPLOYMENT.md)](docs/DEPLOYMENT.md) — Step-by-step Netlify, Vercel, and Supabase cloud setup.
* 📕 [Database Architecture (docs/DATABASE.md)](docs/DATABASE.md) — PostgreSQL schema, security policies, and performance indexes.
* 📗 [API Reference (docs/API.md)](docs/API.md) — Edge function request/response contracts and error codes.
* 📙 [Backup & Recovery (docs/BACKUP.md)](docs/BACKUP.md) — Encrypted SQL export mechanics and disaster recovery procedures.

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome!

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

Please ensure all tests pass (`npm test`) and typechecks succeed (`npm run typecheck`) before submitting your PR.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
