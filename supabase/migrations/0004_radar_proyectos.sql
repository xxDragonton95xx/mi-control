-- =========================================================
-- Mi Control — Radar de proyectos
-- Ejecutar en Supabase: SQL Editor → New query → Run
-- Solo agrega columnas, una tabla y triggers; no cambia datos existentes.
-- =========================================================

-- with_whom:        con quién llevas el proyecto (texto libre, opcional).
-- last_activity_at: último movimiento real (paso agregado o completado, nota, cambio de estado).
alter table projects
  add column with_whom text,
  add column last_activity_at timestamptz not null default now();

-- Punto de partida para proyectos que ya existían: su último paso tocado, o su fecha de creación.
update projects p
set last_activity_at = greatest(
  p.created_at,
  coalesce((select max(coalesce(t.completed_at, t.created_at)) from tasks t where t.project_id = p.id), p.created_at)
);

-- ---------- Bitácora por proyecto ----------
create table project_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid not null references projects on delete cascade,
  note text not null,
  -- true = la escribió la app (paso completado, cambio de estado); false = la escribiste tú.
  auto boolean not null default false,
  created_at timestamptz not null default now()
);

create index on project_logs (project_id, created_at desc);
create index on project_logs (user_id, created_at desc);

alter table project_logs enable row level security;
create policy "solo mis datos" on project_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Movimiento automático ----------

-- Un paso nuevo, completado o editado cuenta como movimiento del proyecto.
-- Al completarse un paso, queda anotado en la bitácora.
create or replace function public.radar_touch_from_task()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id is null then
    return new;
  end if;
  update public.projects set last_activity_at = now() where id = new.project_id;
  if tg_op = 'UPDATE' and new.status = 'hecha' and old.status is distinct from 'hecha' then
    insert into public.project_logs (user_id, project_id, note, auto)
    values (new.user_id, new.project_id, 'Completó: ' || new.title, true);
  end if;
  return new;
end;
$$;

create trigger radar_touch_from_task
  after insert or update of status, title, due_date on tasks
  for each row execute function public.radar_touch_from_task();

-- Una nota tuya en la bitácora también es movimiento. Las automáticas se saltan:
-- quien las inserta ya actualizó el proyecto (y así no se modifica la misma fila dos veces).
create or replace function public.radar_touch_from_log()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.projects set last_activity_at = greatest(last_activity_at, new.created_at) where id = new.project_id;
  return new;
end;
$$;

create trigger radar_touch_from_log
  after insert on project_logs
  for each row
  when (not new.auto)
  execute function public.radar_touch_from_log();

-- Cambiar de estado (idea → activo, activo → terminado…) se registra en la bitácora.
create or replace function public.radar_project_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.last_activity_at := now();
  insert into public.project_logs (user_id, project_id, note, auto)
  values (new.user_id, new.id, 'Cambió a ' || new.status::text, true);
  return new;
end;
$$;

create trigger radar_project_status_change
  before update of status on projects
  for each row
  when (old.status is distinct from new.status)
  execute function public.radar_project_status_change();
