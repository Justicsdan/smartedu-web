alter table cbt_exams add column if not exists course_id uuid references uni_courses(id) on delete set null;
alter table live_classes add column if not exists course_id uuid references uni_courses(id) on delete set null;
alter table live_classes add column if not exists duration_minutes integer;
alter table live_classes add column if not exists join_url text;
alter table live_classes add column if not exists instructions text;
