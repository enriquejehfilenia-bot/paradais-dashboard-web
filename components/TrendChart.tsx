'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const fm = (n: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

interface Props { data: Record<string, unknown>[] }

export default function TrendChart({ data }: Props) {
  // Agrupar por mes
  const byMes: Record<string, { Ventas: number; Costos: number; Margen: number }> = {}
  const MES_ORD = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                   'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']

  for (const row of data) {
    const mes = String(row.mes || '').toUpperCase()
    if (!mes) continue
    if (!byMes[mes]) byMes[mes] = { Ventas: 0, Costos: 0, Margen: 0 }
    byMes[mes].Ventas += Number(row.total_venta_real ?? 0)
    byMes[mes].Costos += Number(row.costos           ?? 0)
    byMes[mes].Margen += Number(row.margen            ?? 0)
  }

  const chartData = MES_ORD
    .filter(m => byMes[m])
    .map(m => ({ name: m.slice(0, 3), ...byMes[m] }))

  if (!chartData.length) return <div className="flex items-center justify-center h-40 text-text-soft text-sm">Sin datos</div>

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716C' }} />
        <YAxis tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#78716C' }} width={55} />
        <Tooltip formatter={(v: number) => fm(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
        <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="Ventas" stroke="#EAB308" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="Costos" stroke="#475569" strokeWidth={2}   dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Margen" stroke="#10B981" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  )
}
