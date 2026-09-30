export default function ComingSoon({ title, phase, children }: { title: string; phase: number; children: string }) {
  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
        <p className="text-sm font-semibold text-brand-600 dark:text-brand-500">Fase {phase}</p>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{children}</p>
      </div>
    </section>
  )
}
