'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMediosData } from '@/lib/api'
import { clearAuth } from '@/lib/auth'
import MediosDashboard from '@/components/MediosDashboard'

export default function MediosPage() {
  const router = useRouter()
  const [state, setState] = useState<{
    loading:   boolean
    error:     string | null
    data:      Record<string, unknown>[] | null
    updatedAt: string
  }>({ loading: true, error: null, data: null, updatedAt: '' })

  useEffect(() => {
    getMediosData()
      .then(res => {
        if (!res.data) {
          setState(s => ({ ...s, loading: false, error: '📭 No hay datos de medios. Ejecuta ACTUALIZAR MEDIOS.bat para cargar los datos.' }))
          return
        }
        setState({ loading: false, error: null, data: res.data as Record<string, unknown>[], updatedAt: res.updated_at })
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
        <p className="text-text-soft text-sm">Cargando datos de medios...</p>
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <MediosDashboard
      data={state.data as any}
      updatedAt={state.updatedAt}
      onLogout={logout}
    />
  )
}
