/**
 * Skeleton de carga — reemplaza el spinner mientras llegan los datos.
 * Replica el layout real (header, tabs, filtros, KPIs, gráficos) para que
 * la transición a los datos reales no salte de un layout a otro.
 */
export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bg px-4 md:px-8 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-4 border-b-2 border-border">
        <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="skeleton h-5 w-40 rounded" />
          <div className="skeleton h-3 w-56 rounded" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <div className="skeleton h-7 w-32 rounded-full" />
        <div className="skeleton h-7 w-32 rounded-full" />
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-xl border border-border px-4 py-3 mb-4">
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="skeleton h-3 w-14 rounded" />
              <div className="skeleton h-8 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-7 w-28 rounded" />
            <div className="skeleton h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="skeleton h-4 w-48 rounded mb-4" />
          <div className="skeleton h-52 w-full rounded-lg" />
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="skeleton h-4 w-48 rounded mb-4" />
          <div className="skeleton h-52 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
