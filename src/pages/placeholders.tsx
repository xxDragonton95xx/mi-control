import ComingSoon from '../components/ComingSoon'

export function Pendientes() {
  return (
    <ComingSoon title="Pendientes" phase={3}>
      Tu lista de pendientes con filtros por día, semana y proyecto.
    </ComingSoon>
  )
}

export function Semana() {
  return (
    <ComingSoon title="Semana" phase={4}>
      Vista de lunes a domingo con tus rutinas y bloques de actividades.
    </ComingSoon>
  )
}

export function Metas() {
  return (
    <ComingSoon title="Metas y proyectos" phase={3}>
      Tus metas por área de vida, sus proyectos y el plan de acción de cada uno.
    </ComingSoon>
  )
}
