# Mi Control

App personal para gastos, pendientes, calendario semanal, metas y proyectos.

**Stack:** React + Vite + TypeScript + Tailwind · Supabase (Auth + PostgreSQL) · Vercel · PWA

## Desarrollo local

1. Copia `.env.example` a `.env.local` y llena la URL y la anon key de Supabase.
2. `npm install`
3. `npm run dev` → http://localhost:5173

## Base de datos

El esquema está en `supabase/migrations/`. Cada archivo se ejecuta una vez, en orden, en
Supabase → SQL Editor.

## Deploy

Vercel importa el repo de GitHub. Variables de entorno requeridas en Vercel:
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
