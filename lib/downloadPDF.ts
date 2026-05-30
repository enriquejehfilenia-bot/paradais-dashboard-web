/**
 * PDF Paradais DDB — tema oscuro idéntico al dashboard.
 * Pág 1: Header + KPIs + Tendencia + Donut
 * Pág 2: Semáforos (nativo) + Top 10 Clientes
 *
 * Fondo oscuro mediante imagen canvas (garantiza rendering en todos los viewers).
 * Layout con coordenadas absolutas hardcodeadas.
 */

export interface PDFKpi {
  label:      string
  value:      string
  badge?:     string
  badgeType?: 'green' | 'amber' | 'red' | 'neutral'
}
export interface PDFChartEl   { el: HTMLElement | null; title: string }
export interface PDFTableData { headers: string[]; rows: string[][] }
export interface SpecialAccountEntry { label: string; real: number; meta: number }

export interface PDFOptions {
  filename:         string
  title:            string
  filters:          string
  date:             string
  kpis:             PDFKpi[]
  charts:           PDFChartEl[]   // [0]=Tendencia [1]=Donut [2]=SACfallback [3]=TopClientes
  specialAccounts?: SpecialAccountEntry[]
}

// ── Paleta ────────────────────────────────────────────────────────────────────
const PAL = {
  pageBg:  '#0F0E0D',
  card:    '#1C1917',
  cardEl:  '#242120',
  border:  [44,  41,  38] as [number,number,number],
  accent:  [234,179,   8] as [number,number,number],
  text:    [242,240, 238] as [number,number,number],
  soft:    [120,113, 108] as [number,number,number],
  green:   [ 34,197,  94] as [number,number,number],
  amber:   [251,191,  36] as [number,number,number],
  red:     [248,113, 113] as [number,number,number],
  greenBg: [ 20, 50,  30] as [number,number,number],
  amberBg: [ 60, 45,   5] as [number,number,number],
  redBg:   [ 55, 15,  15] as [number,number,number],
}

const fmPDF = (n: number) =>
  '$' + Math.round(n).toLocaleString('es-EC', { minimumFractionDigits: 0 })

// ── Crea imagen de fondo oscuro via canvas (1×1 px estirado) ─────────────────
function makeDarkBgUrl(color: string): string {
  const c = document.createElement('canvas')
  c.width = 1; c.height = 1
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  return c.toDataURL('image/png')
}

// ── Captura html2canvas con fondo oscuro ──────────────────────────────────────
async function capture(
  h2c: (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>,
  el: HTMLElement,
): Promise<string | null> {
  try {
    const cv = await h2c(el, {
      scale: 2, useCORS: true,
      backgroundColor: PAL.card,
      logging: false, removeContainer: true,
    })
    return cv.toDataURL('image/png')
  } catch { return null }
}

export async function downloadDashboardPDF(opts: PDFOptions): Promise<void> {
  const [{ default: h2c }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  // ── Capturar todas las imágenes ANTES de crear el PDF ─────────────────────
  const [imgT, imgD, imgTop] = await Promise.all([
    opts.charts[0]?.el ? capture(h2c, opts.charts[0].el) : Promise.resolve(null),
    opts.charts[1]?.el ? capture(h2c, opts.charts[1].el) : Promise.resolve(null),
    (opts.charts[3]?.el ?? opts.charts[2]?.el)
      ? capture(h2c, (opts.charts[3]?.el ?? opts.charts[2]?.el)!)
      : Promise.resolve(null),
  ])

  // Imagen de fondo: 1×1 pixel oscuro estirado a toda la página
  const bgUrl = makeDarkBgUrl(PAL.pageBg)

  // ── Inicializar PDF ────────────────────────────────────────────────────────
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 297, H = 210, mg = 12

  // ── Layout fijo (mm) ──────────────────────────────────────────────────────
  const HDR_H    = 19      // altura barra header
  const ACCENT_H = 1.2     // línea dorada
  const TOP_Y    = HDR_H + ACCENT_H + 2   // = 22.2  primer contenido
  const FOOT_Y   = H - 8                  // = 202   línea footer
  const COL_W    = (W - mg * 2 - 5) / 2  // = 134   ancho de columna
  const COL2_X   = mg + COL_W + 5        // = 151   x columna derecha

  // ── Helpers ──────────────────────────────────────────────────────────────

  function addBg(page: number) {
    pdf.setPage(page)
    pdf.addImage(bgUrl, 'PNG', 0, 0, W, H)
  }

  function drawHeader(page: number, total: number) {
    pdf.setPage(page)
    // Barra oscura
    pdf.setFillColor(28, 25, 23)
    pdf.rect(0, 0, W, HDR_H, 'F')
    // Línea accent
    pdf.setFillColor(...PAL.accent)
    pdf.rect(0, HDR_H, W, ACCENT_H, 'F')
    // Logo
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11)
    pdf.setTextColor(...PAL.text)
    pdf.text('Paradais DDB', mg, 12.5)
    // Sep
    pdf.setDrawColor(...PAL.accent); pdf.setLineWidth(0.5)
    pdf.line(mg + 38, 4, mg + 38, 16)
    // Módulo
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5)
    pdf.setTextColor(...PAL.soft)
    pdf.text(opts.title, mg + 42, 12.5)
    // Fecha / pág
    pdf.setFontSize(7.5)
    pdf.text(opts.date, W - mg, 8.5, { align: 'right' })
    pdf.text(`Pág. ${page} / ${total}`, W - mg, 16, { align: 'right' })
  }

  function drawFooter(page: number) {
    pdf.setPage(page)
    pdf.setDrawColor(...PAL.border); pdf.setLineWidth(0.3)
    pdf.line(mg, FOOT_Y + 1, W - mg, FOOT_Y + 1)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6)
    pdf.setTextColor(...PAL.soft)
    pdf.text(
      `Paradais DDB  ·  ${opts.title}  ·  ${opts.date}  ·  Documento confidencial`,
      W / 2, H - 3, { align: 'center' },
    )
  }

  function secTitle(text: string, x: number, y: number) {
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7)
    pdf.setTextColor(...PAL.soft)
    pdf.text(text, x, y)
    pdf.setFillColor(...PAL.accent)
    pdf.rect(x, y + 1, Math.min(pdf.getTextWidth(text), 130), 0.6, 'F')
  }

  function card(x: number, y: number, w: number, h: number) {
    pdf.setFillColor(28, 25, 23)
    pdf.setDrawColor(...PAL.border); pdf.setLineWidth(0.3)
    pdf.roundedRect(x, y, w, h, 2, 2, 'FD')
  }

  function placeImg(img: string | null, x: number, y: number, w: number, h: number) {
    card(x, y, w, h)
    const pad = 1.5
    if (img) pdf.addImage(img, 'PNG', x + pad, y + pad, w - pad * 2, h - pad * 2)
    else {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7)
      pdf.setTextColor(...PAL.soft)
      pdf.text('Sin datos', x + w / 2, y + h / 2, { align: 'center' })
    }
  }

  // ── KPI cards ─────────────────────────────────────────────────────────────
  function drawKPIs(y: number, h: number) {
    const kpis = opts.kpis.slice(0, 4)
    const cW   = (W - mg * 2) / kpis.length
    kpis.forEach((kpi, i) => {
      const x = mg + i * cW, w = cW - 3
      // Sombra
      pdf.setFillColor(10, 9, 8)
      pdf.roundedRect(x + 1.5, y + 1.5, w, h, 2.5, 2.5, 'F')
      // Card
      pdf.setFillColor(28, 25, 23)
      pdf.setDrawColor(...PAL.border); pdf.setLineWidth(0.3)
      pdf.roundedRect(x, y, w, h, 2.5, 2.5, 'FD')
      // Franja de color arriba
      const ac: [number,number,number] =
        kpi.badgeType === 'green' ? PAL.green :
        kpi.badgeType === 'amber' ? PAL.amber :
        kpi.badgeType === 'red'   ? PAL.red   : PAL.accent
      pdf.setFillColor(...ac)
      pdf.roundedRect(x, y, w, 2.5, 2.5, 2.5, 'F')
      pdf.rect(x, y + 1.5, w, 1, 'F')
      // Label
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(5.5)
      pdf.setTextColor(...PAL.soft)
      pdf.text(kpi.label.toUpperCase(), x + 4, y + 9)
      // Valor
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14)
      pdf.setTextColor(...PAL.text)
      pdf.text(kpi.value, x + 4, y + 18.5)
      // Badge
      if (kpi.badge) {
        const bgC: [number,number,number] =
          kpi.badgeType === 'green' ? PAL.greenBg :
          kpi.badgeType === 'amber' ? PAL.amberBg :
          kpi.badgeType === 'red'   ? PAL.redBg   : [36,33,32]
        const txC: [number,number,number] =
          kpi.badgeType === 'green' ? PAL.green :
          kpi.badgeType === 'amber' ? PAL.amber :
          kpi.badgeType === 'red'   ? PAL.red   : PAL.soft
        pdf.setFontSize(5.5)
        const bW = pdf.getTextWidth(kpi.badge) + 5
        pdf.setFillColor(...bgC)
        pdf.roundedRect(x + 3, y + 20.5, bW, 4, 1, 1, 'F')
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...txC)
        pdf.text(kpi.badge, x + 5.5, y + 23.7)
      }
    })
  }

  // ── Franja filtros ────────────────────────────────────────────────────────
  function drawFilters(y: number) {
    if (!opts.filters) return
    pdf.setFillColor(36, 33, 32)
    pdf.setDrawColor(...PAL.border); pdf.setLineWidth(0.3)
    pdf.roundedRect(mg, y, W - mg * 2, 6, 1.5, 1.5, 'FD')
    pdf.setFillColor(...PAL.accent)
    pdf.roundedRect(mg + 2, y + 1, 14, 4, 1, 1, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(5)
    pdf.setTextColor(15, 14, 13)
    pdf.text('FILTROS', mg + 3.5, y + 3.9)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5)
    pdf.setTextColor(...PAL.soft)
    const txt = pdf.splitTextToSize(opts.filters, W - mg * 2 - 22)[0]
    pdf.text(txt, mg + 18, y + 4.2)
  }

  // ── Semáforos nativos ─────────────────────────────────────────────────────
  function drawSemaforos(
    accs: SpecialAccountEntry[],
    x: number, y: number, w: number, totalH: number,
  ) {
    card(x, y, w, totalH)
    if (!accs.length) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7)
      pdf.setTextColor(...PAL.soft)
      pdf.text('Sin cuentas especiales para los filtros activos',
        x + w / 2, y + totalH / 2, { align: 'center' })
      return
    }
    const pad = 4
    const avail = totalH - pad * 2
    const rowH  = Math.min(14, avail / Math.max(accs.length, 1))
    const maxR  = Math.floor(avail / rowH)
    let cy = y + pad
    accs.slice(0, maxR).forEach(acc => {
      const pct = acc.meta > 0 ? (acc.real / acc.meta) * 100 : 0
      const st  = pct >= 100 ? 'green' : pct >= 85 ? 'amber' : 'red'
      const sc  = st === 'green' ? PAL.green : st === 'amber' ? PAL.amber : PAL.red
      const bc  = st === 'green' ? PAL.greenBg : st === 'amber' ? PAL.amberBg : PAL.redBg
      const ic  = st === 'green' ? 'OK' : st === 'amber' ? '~!' : 'X'
      const rh  = rowH - 2
      const rx  = x + 3, rw = w - 6
      // Fondo
      pdf.setFillColor(...bc)
      pdf.roundedRect(rx, cy, rw, rh, 1.5, 1.5, 'F')
      // Strip color
      pdf.setFillColor(...sc)
      pdf.roundedRect(rx, cy, 3, rh, 1.5, 1.5, 'F')
      pdf.rect(rx + 1.5, cy, 1.5, rh, 'F')
      // Ícono
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7)
      pdf.setTextColor(...sc)
      pdf.text(ic, rx + 5, cy + rh * 0.48)
      // Label
      let lbl = acc.label
      pdf.setFontSize(6.5)
      const maxLW = rw - 44
      while (pdf.getTextWidth(lbl) > maxLW && lbl.length > 5) lbl = lbl.slice(0, -1)
      if (lbl.length < acc.label.length) lbl += '…'
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...PAL.text)
      pdf.text(lbl, rx + 10, cy + rh * 0.48)
      // % (derecha)
      pdf.setFontSize(8.5); pdf.setTextColor(...sc)
      pdf.text(`${pct.toFixed(1)}%`, rx + rw - 2, cy + rh * 0.48, { align: 'right' })
      // Real · Meta
      if (rh > 9) {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(5)
        pdf.setTextColor(...PAL.soft)
        const realStr = fmPDF(acc.real)
        pdf.text(`Real: `, rx + 10, cy + rh * 0.75)
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...PAL.text)
        pdf.text(realStr, rx + 10 + pdf.getTextWidth('Real: '), cy + rh * 0.75)
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...PAL.soft)
        pdf.text(
          `  ·  Meta: ${fmPDF(acc.meta)}`,
          rx + 10 + pdf.getTextWidth('Real: ') + pdf.getTextWidth(realStr),
          cy + rh * 0.75,
        )
      }
      // Barra de progreso
      const barY = cy + rh - 2.5, barW = rw - 2, fill = Math.min(pct / 100, 1) * barW
      pdf.setFillColor(36, 33, 32)
      pdf.roundedRect(rx + 1, barY, barW, 1.5, 0.5, 0.5, 'F')
      if (fill > 0.5) {
        pdf.setFillColor(...sc)
        pdf.roundedRect(rx + 1, barY, fill, 1.5, 0.5, 0.5, 'F')
      }
      cy += rowH
    })
    if (accs.length > maxR) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(5.5)
      pdf.setTextColor(...PAL.soft)
      pdf.text(`+ ${accs.length - maxR} más`, x + 5, y + totalH - 2)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PÁGINA 1 — KPIs + Tendencia + Donut
  // ─────────────────────────────────────────────────────────────────────────

  // Posiciones absolutas página 1
  const P1_FILTER_Y  = TOP_Y                            // 22.2
  const P1_FILTER_H  = opts.filters ? 6 : 0
  const P1_KPI_Y     = P1_FILTER_Y + P1_FILTER_H + 2   // 30.2 / 24.2
  const P1_KPI_H     = 27
  const P1_TITLE_Y   = P1_KPI_Y + P1_KPI_H + 4         // ~61
  const P1_CHART_Y   = P1_TITLE_Y + 6                   // ~67
  const P1_CHART_H   = FOOT_Y - P1_CHART_Y              // ~135

  // Renderizar
  addBg(1)
  drawHeader(1, 2)
  drawFilters(P1_FILTER_Y)
  drawKPIs(P1_KPI_Y, P1_KPI_H)
  // Títulos gráficos
  pdf.setPage(1)
  secTitle(opts.charts[0]?.title ?? 'Tendencia Mensual', mg, P1_TITLE_Y)
  secTitle(opts.charts[1]?.title ?? 'Participación',     COL2_X, P1_TITLE_Y)
  // Gráficos
  placeImg(imgT,   mg,     P1_CHART_Y, COL_W, P1_CHART_H)
  placeImg(imgD, COL2_X,   P1_CHART_Y, COL_W, P1_CHART_H)
  drawFooter(1)

  // ─────────────────────────────────────────────────────────────────────────
  // PÁGINA 2 — Semáforos + Top 10 Clientes
  // ─────────────────────────────────────────────────────────────────────────

  // Posiciones absolutas página 2 (hardcoded, sin variables)
  const P2_TITLE_Y = 26     // mm desde el top (justo bajo header)
  const P2_CARD_Y  = 32     // mm donde empieza el contenido
  const P2_CARD_H  = FOOT_Y - P2_CARD_Y  // = 170

  pdf.addPage()
  addBg(2)
  drawHeader(2, 2)

  pdf.setPage(2)
  secTitle('Cuentas Especiales · Semaforos de Cumplimiento', mg, P2_TITLE_Y)
  secTitle('Top 10 Clientes Privados', COL2_X, P2_TITLE_Y)

  drawSemaforos(opts.specialAccounts ?? [], mg, P2_CARD_Y, COL_W, P2_CARD_H)
  placeImg(imgTop, COL2_X, P2_CARD_Y, COL_W, P2_CARD_H)

  drawFooter(2)

  pdf.save(opts.filename)
}
