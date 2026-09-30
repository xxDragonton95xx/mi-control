import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import Layout from './components/Layout'
import Login from './pages/Login'
import Hoy from './pages/Hoy'
import Gastos from './pages/gastos/Gastos'
import Categorias from './pages/gastos/Categorias'
import Pendientes from './pages/pendientes/Pendientes'
import Semana from './pages/semana/Semana'
import Rutinas from './pages/semana/Rutinas'
import Metas from './pages/metas/Metas'
import MetaDetalle from './pages/metas/MetaDetalle'
import ProyectoDetalle from './pages/metas/ProyectoDetalle'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-400">Cargando…</div>
  }

  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Hoy />} />
        <Route path="gastos" element={<Gastos />} />
        <Route path="gastos/categorias" element={<Categorias />} />
        <Route path="pendientes" element={<Pendientes />} />
        <Route path="semana" element={<Semana />} />
        <Route path="semana/rutinas" element={<Rutinas />} />
        <Route path="metas" element={<Metas />} />
        <Route path="metas/:id" element={<MetaDetalle />} />
        <Route path="metas/proyectos/:id" element={<ProyectoDetalle />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
