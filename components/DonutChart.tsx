'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts'

const COLORS = ['#EAB308','#10B981','#6366F1','#F59E0B','#0EA5E9','#DC2626','#64748B','#EC4899']
const fm = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

interface Props { data: Record<string, unknown>[]; total: number }

export default function DonutChart({ data, total }: Props) {
  const byDept: Record<string, number> = {}
  for (const row of data) {
    const d = String(row.departamento_limpio || 'Otro')
    byDept[d] = (byDept[d] ?? 0) + Number(row.total_venta_real ?? 0)
  }

  const chartData = Object.entries(byDept)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({
      name,
      value,
      pct: total > 0 ? (value / total * 100) : 0,
    }))

  if (!chartData.length) return <div className="flex items-center justify-center h-40 text-text-soft text-sm">Sin datos</div>

  const totalStr = '$' + Math.round(total).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  // Label renderizado por Recharts con cx/cy exactos del centro del Pie
  const CenterLabel = ({ viewBox }: { viewBox?: { cx?: number; cy?: number } }) => {
    const cx = viewBox?.cx ?? 0
    const cy = viewBox?.cy ?? 0
    return (
      <g>
        <text x={cx} y={cy - 10} textAnchor="middle" dominantBaseline="middle" fill="#A8A29E" fontSize={10} fontWeight={600}>
          TOTAL
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="middle" fill="#F2F0EE" fontSize={13} fontWeight={700}>
          {totalStr}
        </text>
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="40%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          dataKey="value"
          paddingAngle={2}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#0F0E0D" strokeWidth={2} />
          ))}
          <Label content={<CenterLabel />} position="center" />
        </Pie>
        <Tooltip
          formatter={(v: number, name: string) => [
            `${total > 0 ? ((v / total) * 100).toFixed(1) : 0}% · ${fm(v)}`,
            name,
          ]}
          contentStyle={{ borderRadius: 8, border: '1px solid #2C2926', background: '#1C1917', color: '#F2F0EE', fontSize: 12 }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          wrapperStyle={{ fontSize: 11, color: '#A8A29E' }}
          formatter={(value: string, entry: unknown) => {
            const e = entry as { payload?: { pct?: number } }
            const pct = e?.payload?.pct ?? 0
            return `${value} · ${pct.toFixed(1)}%`
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
