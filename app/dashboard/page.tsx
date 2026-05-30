'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getData } from '@/lib/api'
import { clearAuth } from '@/lib/auth'
import Dashboard from '@/components/Dashboard'

export default function DashboardPage() {
  const router   = useRouter()
  const [state, setState] = useState<{
    loading:      boolean
    error:        string | null
    data:         Record<string, unknown>[] | null
    projections:  Record<string, number>
    filename:     string
    updatedAt:    string
    totalVentas:  number | null
    totalCostos:  number | null
    totalMargen:  number | null
  }>({ loading: true, error: null, data: null, projections: {}, filename: '', updatedAt: '', totalVentas: null, totalCostos: null, totalMargen: null })

  useEffect(() => {
    getData()
      .then(res => {
        if (!res.data) {
          setState(s => ({ ...s, loading: false, error: '📭 El administrador aún no ha cargado datos. Vuelve más tarde.' }))
          return
        }
        setState({
          loading:     false,
          error:       null,
          data:        res.data as Record<string, unknown>[],
          projections: res.projections,
          filename:    res.filename,
          updatedAt:   res.updated_at,
          totalVentas: res.total_ventas ?? null,
          totalCostos: res.total_costos ?? null,
          totalMargen: res.total_margen ?? null,
        })
      })
      .catch(() => setState(s => ({ ...s, loading: false, error: 'Error al conectar con el servidor.' })))
  }, [])

  async function logout() {
    clearAuth()
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    router.replace('/login')
  }

  if (state.loading) return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-text-soft text-sm">Cargando datos...</p>
      </div>
    </div>
  )

  if (state.error) return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="text-center max-w-sm px-4">
        <p className="text-text-main text-lg mb-4">{state.error}</p>
        <button onClick={logout}
          className="px-5 py-2 bg-dark text-white rounded-lg text-sm font-semibold hover:bg-[#292524] transition">
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <Dashboard
      data={state.data!}
      projections={state.projections}
      onLogout={logout}
      filename={state.filename}
      updatedAt={state.updatedAt}
      totalVentas={state.totalVentas}
      totalCostos={state.totalCostos}
      totalMargen={state.totalMargen}
    />
  )
}
