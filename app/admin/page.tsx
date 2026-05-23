'use client'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { uploadFile, getData } from '@/lib/api'
import { clearAuth } from '@/lib/auth'
import { useEffect } from 'react'

interface DataInfo {
  filename: string
  row_count: number
  updated_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [info, setInfo]         = useState<DataInfo | null>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)
  const [loading, setLoading]   = useState(false)
  const fileRef                 = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getData().then(d => {
      if (d.filename) setInfo({ filename: d.filename, row_count: d.row_count, updated_at: d.updated_at })
    }).catch(() => {})
  }, [])

  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xlsm)$/i)) {
      setMsg({ text: 'Solo se aceptan archivos .xlsx o .xlsm', ok: false }); return
    }
    if (file.size > 50 * 1024 * 1024) {
      setMsg({ text: 'El archivo supera el límite de 50 MB', ok: false }); return
    }
    setLoading(true)
    setMsg(null)
    setProgress(0)
    try {
      const res = await uploadFile(file, pct => setProgress(pct))
      setMsg({ text: `✅ ${res.row_count.toLocaleString()} registros actualizados. Usuarios ya pueden ver la nueva data.`, ok: true })
      setInfo({ filename: res.filename, row_count: res.row_count, updated_at: new Date().toISOString() })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setMsg({ text: msg || 'Error al procesar el archivo', ok: false })
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  function logout() { clearAuth(); router.replace('/login') }

  function fmtDate(iso: string) {
    try { return new Date(iso).toLocaleString('es-EC') } catch { return iso }
  }

  return (
    <div className="min-h-screen bg-bg p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-accent">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-black rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
              <rect x="10" y="7"  width="6" height="13" rx="1" fill="#EAB308"/>
              <path d="M16 7 H22 Q28 7 28 13.5 Q28 20 22 20 H16 Z" fill="#EAB308"/>
              <rect x="10" y="22" width="6" height="15" rx="1" fill="#EAB308"/>
              <path d="M16 22 H23 Q30 22 30 29.5 Q30 37 23 37 H16 Z" fill="#EAB308"/>
            </svg>
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl text-text-main">Panel Administrador</h1>
            <p className="text-xs text-accent font-semibold">🔑 Sesión de administrador</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-border text-text-main hover:bg-gray-50 transition">
            Ver Dashboard
          </button>
          <button onClick={logout}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-dark text-white hover:bg-[#292524] transition">
            🚪 Salir
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Info último archivo */}
        {info && (
          <div className="bg-white rounded-2xl border border-border p-5 shadow-card">
            <p className="text-xs font-bold text-text-soft uppercase tracking-widest mb-3">
              Datos actuales
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-soft">Archivo</p>
                <p className="font-semibold text-text-main text-sm truncate">{info.filename}</p>
              </div>
              <div>
                <p className="text-xs text-text-soft">Registros</p>
                <p className="font-semibold text-text-main text-sm">{info.row_count.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-text-soft">Actualizado</p>
                <p className="font-semibold text-text-main text-sm">{fmtDate(info.updated_at)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload zone */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-card">
          <p className="text-xs font-bold text-text-soft uppercase tracking-widest mb-4">
            {info ? 'Actualizar archivo' : 'Subir archivo de datos'}
          </p>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${dragging ? 'border-accent bg-yellow-50' : 'border-border hover:border-accent hover:bg-yellow-50/30'}`}
          >
            <div className="text-4xl mb-3">📤</div>
            <p className="font-semibold text-text-main mb-1">
              Arrastra aquí tu archivo Excel
            </p>
            <p className="text-sm text-text-soft">o haz clic para seleccionarlo</p>
            <p className="text-xs text-text-soft mt-2">.xlsx · .xlsm · máx. 50 MB</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xlsm"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
          />

          {/* Progress bar */}
          {progress !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-text-soft mb-1">
                <span>Procesando...</span><span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Mensaje resultado */}
          {msg && (
            <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${
              msg.ok
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {msg.text}
            </div>
          )}
        </div>

        {/* Nota de seguridad */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <strong>Nota:</strong> Al subir un nuevo archivo, todos los usuarios verán la data actualizada inmediatamente. El archivo anterior queda reemplazado.
        </div>
      </div>
    </div>
  )
}
