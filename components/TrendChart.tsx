'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const fm = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

/*
  Orden cronológico de meses en español (mayúsculas, sin año).
  El campo `mes` en DataRow ya viene en este formato ("ENERO", "FEBRERO", …).
*/
const MES_ORD = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
]

interface Props { data: Record<string, unknown>[] }

export default function TrendChart({ data }: Props) {
  const byMes: Record<string, { Ventas: number; Costos: number; Margen: number }> = {}

  for (const row of data) {
    /*
      mes puede venir como:
        • "ENERO"           (formato nuevo — nombre de hoja)
        • "enero de 2026"   (formato antiguo — desde fecha)
      Normalizar: quitar acentos, mayúsculas, quedarse con la primera palabra.
    */
    const raw  = String(row.mes ?? '')
    const mes  = raw
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quitar acentos
      .toUpperCase()
      .split(/[\s,]+/)[0]                                 // primera palabra

    if (!mes || !MES_ORD.includes(mes)) continue

    if (!byMes[mes]) byMes[mes] = { Ventas: 0, Costos: 0, Margen: 0 }
    byMes[mes].Ventas += Number(row.total_venta_real ?? 0)
    byMes[mes].Costos += Number(row.costos           ?? 0)
    byMes[mes].Margen += Number(row.margen            ?? 0)
  }

  const chartData = MES_ORD
    .filter(m => byMes[m])
    .map(m => ({ name: m.slice(0, 3), ...byMes[m] }))

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-40 text-text-soft text-sm">
        Sin datos de tendencia
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2C2926" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#A8A29E' }} />
        <YAxis
          tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`}
          tick={{ fontSize: 10, fill: '#A8A29E' }}
          width={55}
        />
        <Tooltip
          formatter={(v: number) => fm(v)}
          contentStyle={{ borderRadius: 8, border: '1px solid #2C2926', background: '#1C1917', color: '#F2F0EE', fontSize: 12 }}
        />
        <Legend iconType="line" wrapperStyle={{ fontSize: 11, color: '#A8A29E' }} />
        <Line type="monotone" dataKey="Ventas" stroke="#EAB308" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="Costos" stroke="#64748B" strokeWidth={2}   dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Margen" stroke="#10B981" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  )
}
