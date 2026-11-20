create table if not exists uni_programmes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  code text,
  award_type text not null default 'general',
  duration_years integer,
  max_level integer,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (school_id, name)
);
alter table uni_programmes add column if not exists calendar_type text default 'semester';
alter table uni_programmes add column if not exists credit_system text default 'credit_units';
alter table uni_programmes add column if not exists repeat_policy text default 'count_all';
alter table uni_programmes add column if not exists grading jsonb;
alter table uni_programmes add column if not exists classification jsonb;
alter table uni_programmes add column if not exists assessment_weights jsonb;
alter table uni_programmes enable row level security;
alter table uni_profiles add column if not exists programme_id uuid references uni_programmes(id) on delete set null;
alter table uni_profiles add column if not exists entry_mode text;
alter table uni_courses add column if not exists programme_id uuid references uni_programmes(id) on delete set null;
