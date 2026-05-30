'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'
import { saveAuth } from '@/lib/auth'

const MAX_INTENTOS  = 5
const BLOQUEO_MS    = 5 * 60 * 1000

export default function LoginPage() {
  const router             = useRouter()
  const [pwd, setPwd]      = useState('')
  const [error, setError]  = useState('')
  const [loading, setLoad] = useState(false)
  const [intentos, setInt] = useState(0)
  const [bloqHasta, setBloq] = useState<number | null>(null)
  const inputRef           = useRef<HTMLInputElement>(null)

  const bloqueado = bloqHasta !== null && Date.now() < bloqHasta

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (bloqueado || loading) return
    setLoad(true)
    setError('')
    try {
      const res = await login(pwd)
      saveAuth(res.token, res.role)
      router.replace(res.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const nuevos = intentos + 1
      setInt(nuevos)
      if (nuevos >= MAX_INTENTOS) {
        setBloq(Date.now() + BLOQUEO_MS)
        setError(`Demasiados intentos. Bloqueado por 5 minutos.`)
      } else if (status === 429) {
        setError('Demasiados intentos. Espera 5 minutos.')
      } else {
        setError(`Contraseña incorrecta. Intentos restantes: ${MAX_INTENTOS - nuevos}`)
      }
      setPwd('')
      inputRef.current?.focus()
    } finally {
      setLoad(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/icon-192.png" alt="Paradais DDB" className="w-20 h-20 rounded-2xl shadow-lg" />
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-serif font-bold text-text-main text-center mb-1">
            Paradais DDB
          </h1>
          <p className="text-text-soft text-sm text-center mb-6">
            Dashboard Ejecutivo
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="password"
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="Contraseña"
                disabled={bloqueado}
                className="w-full px-4 py-3 rounded-lg bg-[#1C1917] text-white border border-[#3D3733] placeholder-[#78716C] focus:outline-none focus:border-accent text-sm"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-red text-sm text-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={bloqueado || loading || !pwd}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all
                bg-[#1C1917] text-white border border-accent
                hover:bg-[#292524] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  Verificando...
                </span>
              ) : 'Ingresar →'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#475569] text-xs mt-6">
          © {new Date().getFullYear()} Paradais DDB · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
