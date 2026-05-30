/**
 * PDF Paradais DDB — tema oscuro idéntico al dashboard.
 *
 * Página 1 → Header + Filtros + KPIs + Tendencia + Donut (sin gaps)
 * Página 2 → Semáforos nativos (izq) + Top 10 Clientes capturado (der)
 *
 * Layout 100% fijo: todas las alturas se calculan desde posiciones absolutas
 * para que no queden espacios blancos entre secciones.
 */

export interface PDFKpi {
  label:      string
  value:      string
  badge?:     string
  badgeType?: 'green' | 'amber' | 'red' | 'neutral'
}

export interface PDFChartEl {
  el:    HTMLElement | null
  title: string
}

export interface PDFTableData {
  headers: string[]
  rows:    string[][]
}

export interface SpecialAccountEntry {
  label: string
  real:  number
  meta:  number
}

export interface PDFOptions {
  filename:         string
  title:            string
  filters:          string
  date:             string
  kpis:             PDFKpi[]
  charts:           PDFChartEl[]   // [0]=Tendencia [1]=Donut [2]=SpecialFallback [3]=TopClientes
  specialAccounts?: SpecialAccountEntry[]
  table?:           PDFTableData
}

// ── Paleta oscura ─────────────────────────────────────────────────────────────
const D = {
  pageBg:   [ 15,  14,  13] as [number,number,number],
  card:     [ 28,  25,  23] as [number,number,number],
  cardEl:   [ 36,  33,  32] as [number,number,number],
  border:   [ 44,  41,  38] as [number,number,number],
  accent:   [234, 179,   8] as [number,number,number],
  textMain: [242, 240, 238] as [number,number,number],
  textSoft: [120, 113, 108] as [number,number,number],
  green:    [ 34, 197,  94] as [number,number,number],
  amber:    [251, 191,  36] as [number,number,number],
  red:      [248, 113, 113] as [number,number,number],
  greenBg:  [ 20,  50,  30] as [number,number,number],
  amberBg:  [ 60,  45,   5] as [number,number,number],
  redBg:    [ 55,  15,  15] as [number,number,number],
}

const fm = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-EC', { minimumFractionDigits: 0 })

// ── Captura html2canvas (fondo oscuro) ────────────────────────────────────────
async function captureEl(
  h2c: (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>,
  el: HTMLElement,
): Promise<string | null> {
  try {
    const canvas = await h2c(el, {
      scale:           2,
      useCORS:         true,
      backgroundColor: '#1C1917',
      logging:         false,
      removeContainer: true,
    })
    return canvas.toDataURL('image/png')
  } catch { return null }
}

export async function downloadDashboardPDF(opts: PDFOptions): Promise<void> {
  const [{ default: h2c }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W   = pdf.internal.pageSize.getWidth()    // 297 mm
  const H   = pdf.internal.pageSize.getHeight()   // 210 mm
  const mg  = 12

  // ── Constantes de layout fijas ────────────────────────────────────────────
  const HEADER_H   = 19    // altura barra header
  const ACCENT_H   = 1.2  // línea dorada
  const CONTENT_Y  = HEADER_H + ACCENT_H + 2  // 22.2 — primer y disponible
  const FOOTER_Y   = H - 8  // donde empieza la zona de pie de página
  const FOOTER_LINE = H - 7

  // ── Fondo completo de página ───────────────────────────────────────────────
  function fillBg() {
    pdf.setFillColor(...D.pageBg)
    pdf.rect(0, 0, W, H, 'F')
  }

  // ── Header ────────────────────────────────────────────────────────────────
  function drawHeader(page: number, total: number) {
    pdf.setFillColor(...D.card)
    pdf.rect(0, 0, W, HEADER_H, 'F')
    pdf.setFillColor(...D.accent)
    pdf.rect(0, HEADER_H, W, ACCENT_H, 'F')
    // Logo
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...D.textMain)
    pdf.text('Paradais DDB', mg, 12.5)
    // Separador
    pdf.setDrawColor(...D.accent)
    pdf.setLineWidth(0.5)
    pdf.line(mg + 38, 4, mg + 38, 16)
    // Módulo
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...D.textSoft)
    pdf.text(opts.title, mg + 42, 12.5)
    // Fecha / paginación
    pdf.setFontSize(7.5)
    pdf.setTextColor(...D.textSoft)
    pdf.text(opts.date, W - mg, 8.5, { align: 'right' })
    pdf.text(`Pág. ${page} / ${total}`, W - mg, 16, { align: 'right' })
  }

  // ── Pie de página ─────────────────────────────────────────────────────────
  function drawFooter() {
    pdf.setDrawColor(...D.border)
    pdf.setLineWidth(0.3)
    pdf.line(mg, FOOTER_LINE, W - mg, FOOTER_LINE)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6)
    pdf.setTextColor(...D.textSoft)
    pdf.text(
      `Paradais DDB  ·  ${opts.title}  ·  ${opts.date}  ·  Documento confidencial`,
      W / 2, H - 3.5, { align: 'center' },
    )
  }

  // ── Sección title pequeño ─────────────────────────────────────────────────
  function secTitle(text: string, x: number, y: number) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(...D.textSoft)
    pdf.text(text, x, y)
    pdf.setFillColor(...D.accent)
    pdf.rect(x, y + 1, pdf.getTextWidth(text), 0.6, 'F')
  }

  // ── Franja de filtros ─────────────────────────────────────────────────────
  function drawFilters(y: number): number {
    if (!opts.filters) return y
    const h = 6
    pdf.setFillColor(...D.cardEl)
    pdf.setDrawColor(...D.border)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(mg, y, W - mg * 2, h, 1.5, 1.5, 'FD')
    // Píldora "FILTROS"
    pdf.setFillColor(...D.accent)
    pdf.roundedRect(mg + 2, y + 1, 14, 4, 1, 1, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(5)
    pdf.setTextColor(...D.pageBg)
    pdf.text('FILTROS', mg + 3.5, y + 3.9)
    // Valor
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(...D.textSoft)
    const line = pdf.splitTextToSize(opts.filters, W - mg * 2 - 22)[0]
    pdf.text(line, mg + 18, y + 4.2)
    return y + h + 2
  }

  // ── KPI cards ─────────────────────────────────────────────────────────────
  function drawKPIs(y: number, h = 27): number {
    const kpis  = opts.kpis.slice(0, 4)
    const cW    = (W - mg * 2) / kpis.length

    kpis.forEach((kpi, i) => {
      const x = mg + i * cW
      const w = cW - 3
      // Sombra
      pdf.setFillColor(10, 9, 8)
      pdf.roundedRect(x + 1.5, y + 1.5, w, h, 2.5, 2.5, 'F')
      // Card
      pdf.setFillColor(...D.card)
      pdf.setDrawColor(...D.border)
      pdf.setLineWidth(0.3)
      pdf.roundedRect(x, y, w, h, 2.5, 2.5, 'FD')
      // Franja de color arriba
      const ac: [number,number,number] =
        kpi.badgeType === 'green' ? D.green :
        kpi.badgeType === 'amber' ? D.amber :
        kpi.badgeType === 'red'   ? D.red   : D.accent
      pdf.setFillColor(...ac)
      pdf.roundedRect(x, y, w, 2.5, 2.5, 2.5, 'F')
      pdf.rect(x, y + 1.5, w, 1, 'F')
      // Label
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(5.5)
      pdf.setTextColor(...D.textSoft)
      pdf.text(kpi.label.toUpperCase(), x + 4, y + 9)
      // Valor
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(15)
      pdf.setTextColor(...D.textMain)
      pdf.text(kpi.value, x + 4, y + 19)
      // Badge
      if (kpi.badge) {
        const bgC: [number,number,number] =
          kpi.badgeType === 'green' ? D.greenBg :
          kpi.badgeType === 'amber' ? D.amberBg :
          kpi.badgeType === 'red'   ? D.redBg   : D.cardEl
        const txC: [number,number,number] =
          kpi.badgeType === 'green' ? D.green :
          kpi.badgeType === 'amber' ? D.amber :
          kpi.badgeType === 'red'   ? D.red   : D.textSoft
        pdf.setFontSize(5.5)
        const bW = pdf.getTextWidth(kpi.badge) + 5
        pdf.setFillColor(...bgC)
        pdf.roundedRect(x + 3, y + 21, bW, 4, 1, 1, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...txC)
        pdf.text(kpi.badge, x + 5.5, y + 24.2)
      }
    })

    return y + h + 3
  }

  // ── Card oscura con imagen adentro ────────────────────────────────────────
  function placeCard(
    img: string | null,
    x: number, y: number, w: number, h: number,
    fallbackText = 'Sin datos',
  ) {
    const pad = 1.5
    pdf.setFillColor(...D.card)
    pdf.setDrawColor(...D.border)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(x, y, w, h, 2, 2, 'FD')
    if (img) {
      pdf.addImage(img, 'PNG', x + pad, y + pad, w - pad * 2, h - pad * 2)
    } else {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(...D.textSoft)
      pdf.text(fallbackText, x + w / 2, y + h / 2, { align: 'center' })
    }
  }

  // ── Semáforos nativos ─────────────────────────────────────────────────────
  function drawSemaforos(
    accounts: SpecialAccountEntry[],
    x: number, y: number, w: number, totalH: number,
  ) {
    // Card contenedor
    pdf.setFillColor(...D.card)
    pdf.setDrawColor(...D.border)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(x, y, w, totalH, 2, 2, 'FD')

    if (!accounts.length) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(...D.textSoft)
      pdf.text('Sin cuentas especiales para los filtros activos', x + w / 2, y + totalH / 2, { align: 'center' })
      return
    }

    const innerPad = 4
    const available = totalH - innerPad * 2
    const rowH    = Math.min(13, available / Math.max(accounts.length, 1))
    const maxRows = Math.floor(available / rowH)
    const visible = accounts.slice(0, maxRows)

    let cy = y + innerPad

    visible.forEach(acc => {
      const pct    = acc.meta > 0 ? (acc.real / acc.meta) * 100 : 0
      const status = pct >= 100 ? 'green' : pct >= 85 ? 'amber' : 'red'
      const stripC = status === 'green' ? D.green : status === 'amber' ? D.amber : D.red
      const bgC    = status === 'green' ? D.greenBg : status === 'amber' ? D.amberBg : D.redBg
      const icon   = status === 'green' ? '✓' : status === 'amber' ? '!' : '✕'

      const rx = x + 3
      const rw = w - 6

      // Fondo del row
      pdf.setFillColor(...bgC)
      pdf.roundedRect(rx, cy, rw, rowH - 1.5, 1.5, 1.5, 'F')

      // Strip izquierdo de color
      pdf.setFillColor(...stripC)
      pdf.roundedRect(rx, cy, 3, rowH - 1.5, 1.5, 1.5, 'F')
      pdf.rect(rx + 1.5, cy, 1.5, rowH - 1.5, 'F')

      // Ícono estado
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(rowH > 11 ? 7 : 6)
      pdf.setTextColor(...stripC)
      pdf.text(icon, rx + 5, cy + (rowH - 1.5) * 0.45)

      // Label (truncar si es muy largo)
      const maxLW = rw - 44
      let label = acc.label
      pdf.setFontSize(rowH > 11 ? 6.5 : 5.5)
      while (pdf.getTextWidth(label) > maxLW && label.length > 6) label = label.slice(0, -1)
      if (label.length < acc.label.length) label += '…'
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...D.textMain)
      pdf.text(label, rx + 10, cy + (rowH - 1.5) * 0.45)

      // Porcentaje (derecha)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(rowH > 11 ? 8.5 : 7)
      pdf.setTextColor(...stripC)
      pdf.text(`${pct.toFixed(1)}%`, rx + rw - 2, cy + (rowH - 1.5) * 0.45, { align: 'right' })

      if (rowH > 10) {
        // Real · Meta en segunda línea
        const line2Y = cy + (rowH - 1.5) * 0.72
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(5)
        pdf.setTextColor(...D.textSoft)
        pdf.text('Real: ', rx + 10, line2Y)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(...D.textMain)
        const realStr = fm(acc.real)
        pdf.text(realStr, rx + 10 + pdf.getTextWidth('Real: '), line2Y)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...D.textSoft)
        pdf.text(`  ·  Meta: ${fm(acc.meta)}`, rx + 10 + pdf.getTextWidth('Real: ') + pdf.getTextWidth(realStr), line2Y)

        // Barra de progreso al fondo del row
        const barY  = cy + rowH - 3.5
        const barW  = rw - 2
        const fillW = Math.min(pct / 100, 1) * barW
        pdf.setFillColor(...D.cardEl)
        pdf.roundedRect(rx + 1, barY, barW, 1.5, 0.5, 0.5, 'F')
        if (fillW > 0.5) {
          pdf.setFillColor(...stripC)
          pdf.roundedRect(rx + 1, barY, fillW, 1.5, 0.5, 0.5, 'F')
        }
      }

      cy += rowH
    })

    if (accounts.length > maxRows) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(5.5)
      pdf.setTextColor(...D.textSoft)
      pdf.text(`+ ${accounts.length - maxRows} más`, x + 5, y + totalH - 2)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCCIÓN DEL PDF
  // ─────────────────────────────────────────────────────────────────────────

  // Página 1: filtros activos determinan si hay franja de filtros
  const hasFilters  = !!opts.filters
  const filterH     = hasFilters ? 8  : 0   // franja filtros
  const kpiH        = 30                    // altura cards KPI (fija)
  const kpiGap      = 3                     // gap entre KPIs y charts

  // Y donde empiezan los gráficos en página 1
  const chartsY = CONTENT_Y + filterH + kpiH + kpiGap
  // Altura disponible para los gráficos hasta el footer
  const chartsH = FOOTER_Y - chartsY - 6   // 6mm = título + margen

  const colW    = (W - mg * 2 - 5) / 2

  // ── Capturar imágenes de página 1 ANTES de iniciar el PDF ─────────────────
  const [imgTendencia, imgDonut] = await Promise.all([
    opts.charts[0]?.el ? captureEl(h2c, opts.charts[0].el) : Promise.resolve(null),
    opts.charts[1]?.el ? captureEl(h2c, opts.charts[1].el) : Promise.resolve(null),
  ])

  // ── Capturar imagen Top 10 Clientes (para página 2) ───────────────────────
  const topEl = opts.charts[3]?.el ?? opts.charts[2]?.el ?? null
  const imgTop = topEl ? await captureEl(h2c, topEl) : null

  // ─────────────────────────────────────────────────────────────────────────
  // PÁGINA 1
  // ─────────────────────────────────────────────────────────────────────────
  fillBg()
  drawHeader(1, 2)

  let cy = CONTENT_Y

  if (hasFilters) {
    drawFilters(cy)
    cy += filterH
  }

  drawKPIs(cy, kpiH)
  cy += kpiH + kpiGap

  // Títulos de los 2 gráficos
  secTitle(opts.charts[0]?.title ?? 'Tendencia Mensual', mg, cy + 3.5)
  secTitle(opts.charts[1]?.title ?? 'Participación', mg + colW + 5, cy + 3.5)

  const imgY = cy + 6
  const imgH = FOOTER_Y - imgY  // llega exactamente hasta el pie de página → sin barra blanca

  placeCard(imgTendencia, mg,            imgY, colW, imgH)
  placeCard(imgDonut,     mg + colW + 5, imgY, colW, imgH)

  drawFooter()

  // ─────────────────────────────────────────────────────────────────────────
  // PÁGINA 2 — Semáforos (izquierda) + Top 10 Clientes (derecha)
  // ─────────────────────────────────────────────────────────────────────────
  pdf.addPage()
  fillBg()
  drawHeader(2, 2)

  const p2ContentY = CONTENT_Y       // 22.2mm — justo bajo el header
  const p2H        = FOOTER_Y - p2ContentY - 6  // altura disponible para las dos columnas

  // Títulos
  secTitle('⭐ Cuentas Especiales · Semáforos de Cumplimiento', mg, p2ContentY + 3.5)
  secTitle('Top 10 Clientes Privados', mg + colW + 5, p2ContentY + 3.5)

  const colY = p2ContentY + 6
  const colH = FOOTER_Y - colY   // sin gaps hasta el pie

  // Semáforos nativos (izquierda)
  drawSemaforos(opts.specialAccounts ?? [], mg, colY, colW, colH)

  // Top 10 Clientes capturado (derecha)
  placeCard(imgTop, mg + colW + 5, colY, colW, colH, 'Gráfico no disponible')

  drawFooter()

  pdf.save(opts.filename)
}
