-- =========================================================
-- Mi Control — esquema inicial
-- Ejecutar completo en Supabase: SQL Editor → New query → Run
-- =========================================================

-- ---------- Tipos ----------
create type life_area as enum ('salud', 'finanzas', 'carrera', 'aprendizaje', 'relaciones', 'personal');
create type goal_status as enum ('activa', 'lograda', 'pausada', 'descartada');
create type project_status as enum ('idea', 'activo', 'pausado', 'terminado');
create type task_status as enum ('pendiente', 'en_progreso', 'hecha');
create type priority_level as enum ('alta', 'media', 'baja');
create type payment_method as enum ('efectivo', 'debito', 'credito', 'transferencia');

-- ---------- Finanzas ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null default '#64748b',
  icon text,
  monthly_budget numeric(12, 2) check (monthly_budget is null or monthly_budget >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- Planeación ----------
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  description text,
  area life_area not null default 'personal',
  target_date date,
  status goal_status not null default 'activa',
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id uuid references goals on delete set null,
  title text not null,
  description text,
  status project_status not null default 'activo',
  priority priority_level not null default 'media',
  start_date date,
  due_date date,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references projects on delete cascade,
  title text not null,
  notes text,
  status task_status not null default 'pendiente',
  priority priority_level not null default 'media',
  due_date date,
  sort_order int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  spent_on date not null default current_date,
  category_id uuid references categories on delete set null,
  description text,
  payment_method payment_method not null default 'debito',
  project_id uuid references projects on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Calendario semanal ----------
create table routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  -- 1 = lunes … 7 = domingo
  weekdays smallint[] not null check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[] and cardinality(weekdays) > 0),
  start_time time,
  end_time time,
  area life_area,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time > start_time)
);

create table routine_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  routine_id uuid not null references routines on delete cascade,
  check_date date not null,
  done boolean not null default true,
  created_at timestamptz not null default now(),
  unique (routine_id, check_date)
);

create table time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  block_date date not null,
  start_time time not null,
  end_time time not null,
  title text not null,
  task_id uuid references tasks on delete set null,
  project_id uuid references projects on delete set null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- ---------- Índices ----------
create index on expenses (user_id, spent_on desc);
create index on expenses (category_id);
create index on expenses (project_id);
create index on goals (user_id);
create index on projects (user_id, goal_id);
create index on tasks (user_id, status, due_date);
create index on tasks (project_id);
create index on routines (user_id);
create index on routine_checks (user_id, check_date);
create index on time_blocks (user_id, block_date);
create index on time_blocks (task_id);
create index on time_blocks (project_id);

-- ---------- Seguridad: cada usuario solo ve sus filas ----------
do $$
declare t text;
begin
  foreach t in array array['categories', 'goals', 'projects', 'tasks', 'expenses', 'routines', 'routine_checks', 'time_blocks']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "solo mis datos" on %I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------- Categorías iniciales al crear la cuenta ----------
create or replace function public.seed_default_categories(uid uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (user_id, name, color, icon, sort_order) values
    (uid, 'Comida',          '#f97316', 'utensils',     1),
    (uid, 'Transporte',      '#3b82f6', 'car',          2),
    (uid, 'Casa',            '#8b5cf6', 'home',         3),
    (uid, 'Servicios',       '#06b6d4', 'zap',          4),
    (uid, 'Salud',           '#ef4444', 'heart-pulse',  5),
    (uid, 'Entretenimiento', '#ec4899', 'popcorn',      6),
    (uid, 'Suscripciones',   '#6366f1', 'repeat',       7),
    (uid, 'Educación',       '#14b8a6', 'graduation-cap', 8),
    (uid, 'Otros',           '#64748b', 'circle-ellipsis', 9)
  on conflict (user_id, name) do nothing;
$$;

revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Por si ya existían cuentas antes de correr este script
select public.seed_default_categories(id) from auth.users;
