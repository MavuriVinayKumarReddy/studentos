-- StudentOS initial schema + RLS
-- Run in Supabase SQL editor or via CLI. Never expose service role keys to the frontend.

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text,
  avatar_url text,
  major text,
  university text,
  year text,
  timezone text not null default 'UTC',
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text,
  color_id text not null default 'indigo',
  color_from text not null default '#6366F1',
  color_to text not null default '#4F46E5',
  instructor text,
  credits numeric,
  semester text,
  archived boolean default false,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject_id uuid references public.subjects(id) on delete set null,
  type text not null default 'Assignment',
  description text,
  due_date date not null,
  due_time text,
  priority text not null default 'Medium',
  status text not null default 'Not Started',
  tentative boolean not null default false,
  estimated_minutes int,
  reminder_prefs jsonb,
  tags text[] default '{}',
  notes text,
  recurrence jsonb,
  completed_at timestamptz,
  project_id uuid,
  roadmap_milestone_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  subject_id uuid references public.subjects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  tags text[] default '{}',
  pinned boolean default false,
  folder text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  subject_id uuid references public.subjects(id) on delete set null,
  status text not null default 'Active',
  target_date date,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_milestones (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'Not Started',
  target_date date,
  completed_at timestamptz,
  sort_order int not null default 0,
  resource_ids uuid[] default '{}'
);

create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text,
  type text not null default 'Course',
  subject_id uuid references public.subjects(id) on delete set null,
  roadmap_id uuid references public.roadmaps(id) on delete set null,
  description text,
  estimated_minutes int,
  completed boolean default false,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dsa_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  platform text,
  url text,
  difficulty text not null default 'Easy',
  status text not null default 'To Solve',
  topics text[] default '{}',
  notes text,
  attempts int default 0,
  solved_at timestamptz,
  time_spent_minutes int,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'Planning',
  subject_id uuid references public.subjects(id) on delete set null,
  start_date date,
  target_date date,
  completed_at timestamptz,
  tech_stack text[] default '{}',
  repo_url text,
  demo_url text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'Not Started',
  due_date date,
  completed_at timestamptz,
  sort_order int not null default 0
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  subject_id uuid references public.subjects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  type text not null default 'Focus',
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes int not null default 0,
  notes text,
  focus_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  title text not null,
  target_minutes int,
  target_tasks int,
  completed_minutes int default 0,
  completed_tasks int default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null default 'InApp',
  sent boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'System',
  read boolean not null default false,
  href text,
  related_id text,
  related_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_subjects_user on public.subjects(user_id);
create index if not exists idx_tasks_user_due on public.tasks(user_id, due_date);
create index if not exists idx_tasks_subject on public.tasks(subject_id);
create index if not exists idx_notes_user on public.notes(user_id);
create index if not exists idx_dsa_user on public.dsa_problems(user_id);
create index if not exists idx_sessions_user on public.study_sessions(user_id, started_at);
create index if not exists idx_notifications_user on public.notifications(user_id, read);

-- RLS
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_attachments enable row level security;
alter table public.notes enable row level security;
alter table public.note_attachments enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_milestones enable row level security;
alter table public.learning_resources enable row level security;
alter table public.dsa_problems enable row level security;
alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.study_sessions enable row level security;
alter table public.weekly_goals enable row level security;
alter table public.reminders enable row level security;
alter table public.notifications enable row level security;

-- Owner policies helper pattern
create policy "profiles_own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "subjects_own" on public.subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tasks_own" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "task_subtasks_own" on public.task_subtasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "task_attachments_own" on public.task_attachments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes_own" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "note_attachments_own" on public.note_attachments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "roadmaps_own" on public.roadmaps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "roadmap_milestones_own" on public.roadmap_milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "learning_resources_own" on public.learning_resources for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dsa_problems_own" on public.dsa_problems for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_own" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "project_milestones_own" on public.project_milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "study_sessions_own" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_goals_own" on public.weekly_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_own" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_own" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket (run once)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

create policy "attachments_select_own"
  on storage.objects for select
  using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "attachments_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "attachments_update_own"
  on storage.objects for update
  using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "attachments_delete_own"
  on storage.objects for delete
  using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);
