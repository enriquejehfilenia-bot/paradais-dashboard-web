'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#EAB308','#1C1917','#10B981','#475569','#F59E0B','#DC2626','#6366F1','#0EA5E9']
const fm = (n: number) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

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
    .map(([name, value]) => ({ name, value }))

  if (!chartData.length) return <div className="flex items-center justify-center h-40 text-text-soft text-sm">Sin datos</div>

  const totalStr = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(total)

  return (
    <div className="relative">
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
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#FFFFFF" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => fm(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }} />
          <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      {/* Total centrado */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingRight: '40%' }}>
        <div className="text-center">
          <p className="text-xs text-text-soft font-semibold">Total</p>
          <p className="font-serif font-bold text-text-main text-sm leading-tight">{totalStr}</p>
        </div>
      </div>
    </div>
  )
}
