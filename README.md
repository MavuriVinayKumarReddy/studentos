# StudentOS

Personal academic & career management app for college students — deadlines, notes, study sessions, DSA tracking, roadmaps, and more.

**Stack:** React + TypeScript + Vite, Tailwind CSS, React Router, IndexedDB (local), optional Supabase, Recharts, PWA.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). Tap **Get Started** to enter local demo mode — data persists in IndexedDB across refreshes.

```bash
npm run build    # production build
npm run preview  # preview production build
npm test         # unit tests (date + task logic)
```

## Local demo vs cloud

Without Supabase env vars the app runs fully offline in **local mode**. Settings shows storage mode clearly; the UI does not pretend data is synced to the cloud.

Copy `.env.example` to `.env` to enable auth:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never put the **service role** key in frontend code.

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Enable Email auth.
3. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor (tables, RLS, storage policies).
4. Confirm the `attachments` storage bucket exists (private).
5. Add the URL + anon key to `.env` and restart Vite.

Cloud bidirectional sync is scaffolded (`dataStore.getMode()` / `syncToCloud`); local IndexedDB remains the working store until sync is fully wired.

## Features

- Home dashboard (greeting, Focus Now, overdue/today/upcoming, subject pills, streak)
- Timeline / calendar / list deadline views with filters & search
- Task CRUD, subtasks, attachments (IndexedDB blobs), duplicate/delete
- Notes with templates, pin, search
- Subjects with color coding; safe delete messaging
- Growth: roadmaps, DSA tracker, courses, projects, weekly goals
- Pomodoro timer (state survives refresh) + study session charts
- Analytics from real saved data
- CSV/JSON import-export (append import, no silent overwrite)
- PWA installable shell + offline app shell caching
- Dark/light theme

## Install on Android

1. Prefer a **hosted HTTPS** deploy (Netlify, Vercel, Cloudflare Pages, etc.) — easiest for install prompts.
2. Open the URL in Chrome → menu → **Install app** / Add to Home screen.
3. For LAN testing: `npm run dev -- --host` then open `http://YOUR_PC_IP:5173` on the phone (same Wi‑Fi). Some browsers require HTTPS for full PWA install; use a tunnel (e.g. Cloudflare Tunnel / ngrok) if install is blocked.

The service worker caches the app shell only — not private API responses.

## Project structure

```
src/
  app/           # router
  components/    # layout, tasks, notes, study-timer, ui
  context/       # auth + app data
  hooks/
  lib/           # dates, task-logic, supabase, constants
  pages/
  repositories/  # IndexedDB + data access layer
  styles/
  types/
  utils/         # export/import
supabase/migrations/
public/icons/    # PWA icons
```

## Design notes

Inspired by the StudyFlow reference: indigo primary (`#4F46E5`), soft lavender background (`#F0F2F8`), navy headings, subject gradient pills, deadline cards with colored left rail and prep progress.
