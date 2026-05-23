'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getData, downloadExcel } from '@/lib/api'
import { clearAuth, isAdmin } from '@/lib/auth'
import Dashboard from '@/components/Dashboard'

export default function DashboardPage() {
  const router   = useRouter()
  const [state, setState] = useState<{
    loading: boolean
    error:   string | null
    data:    Record<string, unknown>[] | null
    projections: Record<string, number>
    filename:    string
    updatedAt:   string
  }>({ loading: true, error: null, data: null, projections: {}, filename: '', updatedAt: '' })

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
        })
      })
      .catch(() => setState(s => ({ ...s, loading: false, error: 'Error al conectar con el servidor.' })))
  }, [])

  function logout() { clearAuth(); router.replace('/login') }

  async function handleDownload() {
    try {
      const blob = await downloadExcel()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `DATA_LIMPIA_${state.filename || 'export'}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Error al descargar el archivo') }
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
      onDownload={handleDownload}
      isAdmin={isAdmin()}
      filename={state.filename}
      updatedAt={state.updatedAt}
    />
  )
}
