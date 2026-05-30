/**
 * Generador de PDF estructurado para los dashboards de Paradais DDB.
 * Construye el documento por secciones (no screenshot de pantalla):
 *   Header con branding → KPI cards → Gráficos capturados → Tabla resumen
 */

export interface PDFKpi {
  label: string
  value: string
  badge?: string
}

export interface PDFChartEl {
  el: HTMLElement | null
  title: string
}

export interface PDFTableData {
  headers: string[]
  rows:    string[][]
}

export interface PDFOptions {
  filename:    string
  title:       string       // "Ventas & Costos" | "Inversión Medios"
  filters:     string       // resumen de filtros activos
  date:        string       // "30/05/2026"
  kpis:        PDFKpi[]
  charts:      PDFChartEl[]
  table?:      PDFTableData
}

// ── Paleta del documento (claro, legible en impresión) ────────────────────────
const C = {
  bg:      [255, 255, 255] as [number,number,number],
  bgCard:  [248, 248, 248] as [number,number,number],
  bgDark:  [ 28,  25,  23] as [number,number,number],
  accent:  [234, 179,   8] as [number,number,number],
  border:  [220, 220, 218] as [number,number,number],
  text:    [ 28,  25,  23] as [number,number,number],
  soft:    [120, 113, 108] as [number,number,number],
  white:   [255, 255, 255] as [number,number,number],
}

export async function downloadDashboardPDF(options: PDFOptions): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const pdf    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW  = pdf.internal.pageSize.getWidth()   // 297 mm
  const pageH  = pdf.internal.pageSize.getHeight()  // 210 mm
  const m      = 12   // margen

  let currentPage = 1

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function newPage() {
    pdf.addPage()
    currentPage++
    drawPageBg()
  }

  function drawPageBg() {
    pdf.setFillColor(...C.bg)
    pdf.rect(0, 0, pageW, pageH, 'F')
  }

  function drawHeader() {
    // Barra oscura superior
    pdf.setFillColor(...C.bgDark)
    pdf.rect(0, 0, pageW, 18, 'F')

    // Línea accent
    pdf.setFillColor(...C.accent)
    pdf.rect(0, 18, pageW, 1.2, 'F')

    // Título
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...C.white)
    pdf.text('Paradais DDB', m, 11)

    // Separador vertical
    pdf.setDrawColor(...C.accent)
    pdf.setLineWidth(0.5)
    pdf.line(m + 36, 5, m + 36, 15)

    // Subtítulo
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(200, 196, 192)
    pdf.text(options.title, m + 39, 11)

    // Fecha + página (derecha)
    pdf.setFontSize(8)
    pdf.setTextColor(160, 156, 152)
    pdf.text(`${options.date}`, pageW - m, 8, { align: 'right' })
    pdf.text(`Página ${currentPage}`, pageW - m, 14, { align: 'right' })

    // Filtros (si existen)
    if (options.filters) {
      pdf.setFontSize(7.5)
      pdf.setTextColor(...C.accent)
      pdf.text(`Filtros: ${options.filters}`, m, 25)
    }
  }

  // ── Sección KPIs ──────────────────────────────────────────────────────────────
  function drawKPIs(y: number): number {
    const kpis   = options.kpis
    const cols   = Math.min(kpis.length, 4)
    const colW   = (pageW - m * 2) / cols
    const cardH  = 22

    kpis.slice(0, 4).forEach((kpi, i) => {
      const x = m + i * colW
      // Card bg
      pdf.setFillColor(...C.bgCard)
      pdf.setDrawColor(...C.border)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(x + 1, y, colW - 2, cardH, 2, 2, 'FD')

      // Línea accent superior
      pdf.setFillColor(...C.accent)
      pdf.rect(x + 1, y, colW - 2, 1.5, 'F')

      // Label
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(...C.soft)
      pdf.text(kpi.label.toUpperCase(), x + 4, y + 7)

      // Value
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.setTextColor(...C.text)
      pdf.text(kpi.value, x + 4, y + 16)

      // Badge
      if (kpi.badge) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6.5)
        pdf.setTextColor(...C.soft)
        pdf.text(kpi.badge, x + 4, y + 21)
      }
    })

    return y + cardH + 5
  }

  // ── Captura de gráfico ────────────────────────────────────────────────────────
  async function embedChart(
    el: HTMLElement,
    x: number, y: number,
    w: number, h: number,
    title: string,
  ) {
    // Título del gráfico
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...C.soft)
    pdf.text(title, x, y - 1.5)

    try {
      const canvas = await html2canvas(el, {
        scale: 1.8,
        useCORS: true,
        backgroundColor: '#1C1917',
        logging: false,
      })
      const img   = canvas.toDataURL('image/png')
      const ratio = canvas.height / canvas.width
      const iH    = Math.min(h, w * ratio)

      // Card bg ligero
      pdf.setFillColor(...C.bgCard)
      pdf.setDrawColor(...C.border)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(x, y, w, h, 2, 2, 'FD')

      pdf.addImage(img, 'PNG', x + 1, y + 1, w - 2, iH - 2)
    } catch {
      // Fallback si html2canvas falla
      pdf.setFillColor(...C.bgCard)
      pdf.setDrawColor(...C.border)
      pdf.roundedRect(x, y, w, h, 2, 2, 'FD')
      pdf.setFontSize(7)
      pdf.setTextColor(...C.soft)
      pdf.text('Gráfico no disponible', x + w / 2, y + h / 2, { align: 'center' })
    }
  }

  // ── Tabla resumen ─────────────────────────────────────────────────────────────
  function drawTable(table: PDFTableData, y: number): number {
    const colW  = (pageW - m * 2) / table.headers.length
    const rowH  = 7
    const headH = 8

    // Encabezado
    pdf.setFillColor(...C.bgDark)
    pdf.rect(m, y, pageW - m * 2, headH, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(...C.white)
    table.headers.forEach((h, i) => {
      pdf.text(h, m + i * colW + 2, y + 5.5)
    })

    // Filas
    table.rows.forEach((row, ri) => {
      const rowY = y + headH + ri * rowH
      if (rowY + rowH > pageH - m) return // no cabe
      pdf.setFillColor(ri % 2 === 0 ? 252 : 248, ri % 2 === 0 ? 252 : 248, ri % 2 === 0 ? 250 : 248)
      pdf.rect(m, rowY, pageW - m * 2, rowH, 'F')
      pdf.setDrawColor(...C.border)
      pdf.setLineWidth(0.2)
      pdf.line(m, rowY + rowH, pageW - m, rowY + rowH)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(6.5)
      pdf.setTextColor(...C.text)
      row.forEach((cell, ci) => {
        pdf.text(String(cell).slice(0, 28), m + ci * colW + 2, rowY + 4.8)
      })
    })

    return y + headH + table.rows.length * rowH + 4
  }

  // ────────────────────────────────────────────────────────────────────────────
  // BUILD PDF
  // ────────────────────────────────────────────────────────────────────────────

  drawPageBg()
  drawHeader()

  const startY = options.filters ? 30 : 26
  let   cursor = drawKPIs(startY)

  // Gráficos en grid de 2 columnas
  const charts  = options.charts.filter(c => c.el !== null)
  const chartW  = (pageW - m * 2 - 4) / 2
  const chartH  = 70

  for (let i = 0; i < charts.length; i += 2) {
    const rowY = cursor
    if (rowY + chartH + 4 > pageH - m) {
      newPage()
      drawHeader()
      cursor = 26
    }

    const left  = charts[i]
    const right = charts[i + 1]

    if (left.el)  await embedChart(left.el,  m,              rowY + 4, chartW, chartH, left.title)
    if (right?.el) await embedChart(right.el, m + chartW + 4, rowY + 4, chartW, chartH, right.title)

    cursor = rowY + chartH + 10
  }

  // Tabla resumen (si existe)
  if (options.table) {
    if (cursor + 30 > pageH - m) {
      newPage()
      drawHeader()
      cursor = 26
    }
    drawTable(options.table, cursor)
  }

  // Pie de página en todas las páginas
  const totalPages = (pdf as unknown as { internal: { pages: unknown[] } }).internal.pages.length - 1
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(...C.soft)
    pdf.text(
      `Paradais DDB · ${options.title} · ${options.date} · Confidencial`,
      pageW / 2, pageH - 4, { align: 'center' }
    )
  }

  pdf.save(options.filename)
}
