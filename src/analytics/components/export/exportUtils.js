import jsPDF from 'jspdf'
import 'jspdf-autotable'
// Build flat column definitions for user report exports (dynamic screens + categories)
function buildUserReportColumns(screenNames = [], categories = []) {
  return [
    { key: 'name', label: 'Name' },
    { key: 'totalSessions', label: 'Total Sessions' },
    { key: 'totalDurationMin', label: 'Duration (min)' },
    { key: 'avgSessionMin', label: 'Avg Session (min)' },
    ...screenNames.map(s => ({ key: `screen_${s}`, label: s })),
    { key: 'screenViewsTotal', label: 'Screen Views Total' },
    { key: 'totalAssets', label: 'Total Assets' },
    ...categories.map(a => ({ key: `asset_${a}`, label: a })),
  ]
}

function buildUserReportGroups(screenNames = [], categories = []) {
  return [
    { label: 'Individual User Activity Report', span: 4 },
    { label: 'Screens Visited', span: screenNames.length + 1 },
    { label: 'Assets Clicked', span: categories.length + 1 },
  ]
}

// Brand colors
const COLORS = {
  primary: [26, 42, 53],      // #1a2a35
  accent: [59, 130, 246],     // #3b82f6
  success: [34, 197, 94],     // #22c55e
  warning: [245, 158, 11],    // #f59e0b
  error: [239, 68, 68],       // #ef4444
  gray: [100, 116, 139],      // #64748b
  lightGray: [241, 245, 249], // #f1f5f9
  white: [255, 255, 255]
}

// Format number with commas
export function formatNumber(num) {
  if (num === null || num === undefined) return '-'
  return num.toLocaleString()
}

// Format percentage
export function formatPercent(num, decimals = 1) {
  if (num === null || num === undefined) return '-'
  return `${num.toFixed(decimals)}%`
}

// Format duration in seconds to readable string
export function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0s'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
  return parts.join(' ')
}

// Escape CSV value properly
function escapeCSV(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Convert data to CSV string
export function toCSV(data, columns) {
  if (!data || data.length === 0) return ''
  const headers = columns.map(col => escapeCSV(col.label))
  const rows = data.map(row =>
    columns.map(col => escapeCSV(row[col.key]))
  )
  return [headers, ...rows].map(row => row.join(',')).join('\n')
}

// Get formatted timestamp for filenames
function getTimestamp() {
  const now = new Date()
  return now.toISOString().slice(0, 10)
}

// BOM for Excel UTF-8 compatibility
const UTF8_BOM = '\uFEFF'

// Download CSV file with BOM for Excel
export function downloadCSV(data, columns, filename) {
  const csv = toCSV(data, columns)
  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${getTimestamp()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Generate CSV for a single section (stats + table data)
export function sectionToCSV(section) {
  let csv = ''

  // Section header
  csv += `"${section.title}"\n`
  csv += '\n'

  // Stats as key-value pairs
  if (section.stats && section.stats.length > 0) {
    csv += '"Metric","Value"\n'
    section.stats.forEach(stat => {
      csv += `${escapeCSV(stat.title)},${escapeCSV(stat.value)}\n`
    })
    csv += '\n'
  }

  // Table data
  if (section.tableData && section.tableData.length > 0 && section.columns) {
    csv += section.columns.map(col => escapeCSV(col.label)).join(',') + '\n'
    section.tableData.forEach(row => {
      csv += section.columns.map(col => escapeCSV(row[col.key])).join(',') + '\n'
    })
  }

  return csv
}

// Download individual section as CSV
export function downloadSectionCSV(section, baseFilename = 'conveymed') {
  const csv = sectionToCSV(section)
  const safeName = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${baseFilename}_${safeName}_${getTimestamp()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Generate comprehensive CSV with all sections
export function generateFullCSV(sections, options = {}) {
  const { dateRange, companyName = 'ConveyMed', allUsers, userReportRows, categories = [], screenNames = [] } = options
  const USER_REPORT_COLUMNS = buildUserReportColumns(screenNames, categories)
  const USER_REPORT_GROUPS = buildUserReportGroups(screenNames, categories)
  let csv = ''

  // Header metadata
  csv += '"ConveyMed Analytics Export"\n'
  csv += `"Generated","${new Date().toLocaleString()}"\n`
  if (dateRange) {
    csv += `"Date Range","${dateRange}"\n`
  }
  csv += '\n'

  // Executive Summary
  csv += '"EXECUTIVE SUMMARY"\n'
  csv += '"Metric","Value"\n'

  const userActivity = sections.find(s => s.id === 'userActivity')
  const feedActivity = sections.find(s => s.id === 'feedActivity')

  if (userActivity?.stats) {
    userActivity.stats.forEach(stat => {
      csv += `${escapeCSV(stat.title)},${escapeCSV(stat.value)}\n`
    })
  }
  if (feedActivity?.stats) {
    feedActivity.stats.forEach(stat => {
      csv += `${escapeCSV(stat.title)},${escapeCSV(stat.value)}\n`
    })
  }
  csv += '\n'

  // Each section with dividers
  sections.forEach(section => {
    csv += '---\n'
    csv += sectionToCSV(section)
    csv += '\n'
  })

  // User report if provided
  if (userReportRows && userReportRows.length > 0) {
    csv += '---\n'
    csv += '"INDIVIDUAL USER REPORT"\n'
    csv += '\n'

    // Group headers
    const groupCells = []
    USER_REPORT_GROUPS.forEach(g => {
      groupCells.push(escapeCSV(g.label))
      for (let i = 1; i < g.span; i++) groupCells.push('')
    })
    csv += groupCells.join(',') + '\n'

    // Column headers
    csv += USER_REPORT_COLUMNS.map(c => escapeCSV(c.label)).join(',') + '\n'

    // Data rows
    userReportRows.forEach(row => {
      csv += USER_REPORT_COLUMNS.map(c => escapeCSV(row[c.key])).join(',') + '\n'
    })
  }

  return csv
}

// Download comprehensive CSV
export function downloadFullCSV(sections, filename, options = {}) {
  const csv = generateFullCSV(sections, options)
  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_full_${getTimestamp()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Download multiple CSVs as a ZIP (requires JSZip)
export async function downloadCSVZip(sections, filename, options = {}) {
  const { allUsers, userReportRows, categories = [], screenNames = [] } = options
  const USER_REPORT_COLUMNS = buildUserReportColumns(screenNames, categories)
  const USER_REPORT_GROUPS = buildUserReportGroups(screenNames, categories)

  // Dynamic import JSZip
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // Summary CSV
  zip.file(`summary_${getTimestamp()}.csv`, UTF8_BOM + generateFullCSV(sections, options))

  // Individual section CSVs
  sections.forEach(section => {
    const safeName = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    zip.file(`${safeName}_${getTimestamp()}.csv`, UTF8_BOM + sectionToCSV(section))
  })

  // User report CSV
  if (userReportRows && userReportRows.length > 0) {
    let reportCsv = '"Individual User Report"\n\n'

    // Group headers
    const groupCells = []
    USER_REPORT_GROUPS.forEach(g => {
      groupCells.push(escapeCSV(g.label))
      for (let i = 1; i < g.span; i++) groupCells.push('')
    })
    reportCsv += groupCells.join(',') + '\n'
    reportCsv += USER_REPORT_COLUMNS.map(c => escapeCSV(c.label)).join(',') + '\n'
    userReportRows.forEach(row => {
      reportCsv += USER_REPORT_COLUMNS.map(c => escapeCSV(row[c.key])).join(',') + '\n'
    })

    zip.file(`user-report_${getTimestamp()}.csv`, UTF8_BOM + reportCsv)
  }

  // Generate and download
  const content = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(content)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_export_${getTimestamp()}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ==========================================
// EXCEL EXPORT
// ==========================================

// Hex color helpers for ExcelJS (ARGB format, no hash)
const XL_COLORS = {
  primary: 'FF1A2A35',
  accent: 'FF3B82F6',
  success: 'FF22C55E',
  warning: 'FFF59E0B',
  error: 'FFEF4444',
  gray: 'FF64748B',
  lightGray: 'FFF1F5F9',
  white: 'FFFFFFFF',
  black: 'FF000000'
}

function styleHeaderRow(row, fillColor = XL_COLORS.primary) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: XL_COLORS.white }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: XL_COLORS.gray } }
    }
  })
  row.height = 28
}

function styleDataRow(row, isAlt = false) {
  row.eachCell(cell => {
    cell.font = { size: 10, color: { argb: XL_COLORS.black } }
    cell.alignment = { vertical: 'middle' }
    if (isAlt) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLORS.lightGray } }
    }
  })
  row.height = 22
}

function autoFitColumns(worksheet) {
  worksheet.columns.forEach(col => {
    let maxLen = 12
    col.eachCell({ includeEmpty: false }, cell => {
      const val = cell.value ? String(cell.value) : ''
      maxLen = Math.max(maxLen, val.length + 2)
    })
    col.width = Math.min(maxLen, 40)
  })
}

function addSectionSheet(workbook, section) {
  const safeName = section.title.slice(0, 31)
  const ws = workbook.addWorksheet(safeName)

  let rowNum = 1

  // Section title
  const titleRow = ws.getRow(rowNum)
  titleRow.getCell(1).value = section.title
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: XL_COLORS.primary } }
  titleRow.height = 30
  rowNum += 2

  // Stats block
  if (section.stats && section.stats.length > 0) {
    const statsHeader = ws.getRow(rowNum)
    statsHeader.getCell(1).value = 'Metric'
    statsHeader.getCell(2).value = 'Value'
    styleHeaderRow(statsHeader, XL_COLORS.accent)
    rowNum++

    section.stats.forEach((stat, i) => {
      const r = ws.getRow(rowNum)
      r.getCell(1).value = stat.title
      r.getCell(2).value = stat.value
      r.getCell(1).font = { size: 10, color: { argb: XL_COLORS.gray } }
      r.getCell(2).font = { bold: true, size: 11, color: { argb: XL_COLORS.primary } }
      styleDataRow(r, i % 2 === 1)
      rowNum++
    })
    rowNum += 1
  }

  // Table data
  if (section.tableData && section.tableData.length > 0 && section.columns) {
    const header = ws.getRow(rowNum)
    section.columns.forEach((col, i) => {
      header.getCell(i + 1).value = col.label
    })
    styleHeaderRow(header, XL_COLORS.primary)
    rowNum++

    section.tableData.forEach((row, ri) => {
      const r = ws.getRow(rowNum)
      section.columns.forEach((col, ci) => {
        const val = row[col.key]
        r.getCell(ci + 1).value = val !== undefined && val !== null ? val : '-'
      })
      styleDataRow(r, ri % 2 === 1)
      rowNum++
    })
  }

  autoFitColumns(ws)
  return ws
}

export async function downloadExcel(sections, filename, options = {}) {
  const ExcelJS = (await import('exceljs')).default
  const { companyName = 'ConveyMed', dateRange, allUsers, userReportRows, categories = [], screenNames = [] } = options
  const USER_REPORT_COLUMNS = buildUserReportColumns(screenNames, categories)
  const USER_REPORT_GROUPS = buildUserReportGroups(screenNames, categories)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = companyName
  workbook.created = new Date()

  // --- Summary sheet ---
  const summary = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: XL_COLORS.accent } }
  })

  let row = 1

  // Title
  const titleRow = summary.getRow(row)
  titleRow.getCell(1).value = `${companyName} Analytics Report`
  titleRow.getCell(1).font = { bold: true, size: 18, color: { argb: XL_COLORS.primary } }
  titleRow.height = 36
  row += 1

  // Metadata
  const genRow = summary.getRow(row)
  genRow.getCell(1).value = 'Generated'
  genRow.getCell(2).value = new Date().toLocaleString()
  genRow.getCell(1).font = { size: 10, color: { argb: XL_COLORS.gray } }
  genRow.getCell(2).font = { size: 10 }
  row++

  if (dateRange) {
    const drRow = summary.getRow(row)
    drRow.getCell(1).value = 'Date Range'
    drRow.getCell(2).value = dateRange
    drRow.getCell(1).font = { size: 10, color: { argb: XL_COLORS.gray } }
    drRow.getCell(2).font = { size: 10 }
    row++
  }
  row++

  // Key metrics header
  const metricsTitle = summary.getRow(row)
  metricsTitle.getCell(1).value = 'Key Metrics'
  metricsTitle.getCell(1).font = { bold: true, size: 13, color: { argb: XL_COLORS.primary } }
  metricsTitle.height = 28
  row++

  const metricsHeader = summary.getRow(row)
  metricsHeader.getCell(1).value = 'Section'
  metricsHeader.getCell(2).value = 'Metric'
  metricsHeader.getCell(3).value = 'Value'
  styleHeaderRow(metricsHeader, XL_COLORS.accent)
  row++

  // All stats from all sections
  sections.forEach(section => {
    if (section.stats && section.stats.length > 0) {
      section.stats.forEach((stat, i) => {
        const r = summary.getRow(row)
        r.getCell(1).value = section.title
        r.getCell(2).value = stat.title
        r.getCell(3).value = stat.value
        styleDataRow(r, row % 2 === 0)
        row++
      })
    }
  })

  autoFitColumns(summary)

  // --- Individual section sheets ---
  sections.forEach(section => {
    addSectionSheet(workbook, section)
  })

  // --- Individual User Report sheet ---
  if (userReportRows && userReportRows.length > 0) {
    const report = workbook.addWorksheet('User Report', {
      properties: { tabColor: { argb: XL_COLORS.success } }
    })

    // Row 1: Group headers (merged)
    let col = 1
    USER_REPORT_GROUPS.forEach(g => {
      const startCol = col
      const endCol = col + g.span - 1
      if (g.span > 1) {
        report.mergeCells(1, startCol, 1, endCol)
      }
      const cell = report.getCell(1, startCol)
      cell.value = g.label
      cell.font = { bold: true, size: 11, color: { argb: XL_COLORS.white } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLORS.primary } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      for (let c = startCol; c <= endCol; c++) {
        const mc = report.getCell(1, c)
        mc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLORS.primary } }
      }
      col = endCol + 1
    })
    report.getRow(1).height = 26

    // Row 2: Column headers
    USER_REPORT_COLUMNS.forEach((c, i) => {
      const cell = report.getCell(2, i + 1)
      cell.value = c.label
      cell.font = { bold: true, size: 10, color: { argb: XL_COLORS.white } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLORS.accent } }
      cell.alignment = { vertical: 'middle' }
    })
    report.getRow(2).height = 24

    // Data rows
    userReportRows.forEach((row, ri) => {
      const r = report.getRow(3 + ri)
      USER_REPORT_COLUMNS.forEach((c, ci) => {
        const cell = r.getCell(ci + 1)
        cell.value = row[c.key] !== undefined ? row[c.key] : 0
        cell.font = { size: 10 }
        if (ri % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: XL_COLORS.lightGray } }
        }
      })
      r.height = 22
    })

    autoFitColumns(report)
  }

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${getTimestamp()}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ==========================================
// PDF EXPORT
// ==========================================

// Add page header
function addPageHeader(pdf, pageNum, totalPages, companyName) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Header line
  pdf.setDrawColor(...COLORS.accent)
  pdf.setLineWidth(0.5)
  pdf.line(20, 15, pageWidth - 20, 15)

  // Company name on left
  pdf.setFontSize(9)
  pdf.setTextColor(...COLORS.gray)
  pdf.text(companyName || 'ConveyMed Analytics', 20, 12)

  // Page number on right
  pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 20, 12, { align: 'right' })

  // Footer line
  pdf.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15)
  pdf.text('Confidential - For Internal Use Only', pageWidth / 2, pageHeight - 10, { align: 'center' })
}

// Add cover page
function addCoverPage(pdf, title, dateRange, companyName) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Header bar
  pdf.setFillColor(...COLORS.primary)
  pdf.rect(0, 0, pageWidth, 90, 'F')

  // Company name
  pdf.setFontSize(12)
  pdf.setTextColor(...COLORS.white)
  pdf.setFont(undefined, 'normal')
  pdf.text((companyName || 'CONVEYMED').toUpperCase(), 20, 30)

  // Main title
  pdf.setFontSize(32)
  pdf.setFont(undefined, 'bold')
  pdf.text('Analytics Report', 20, 55)

  // Subtitle line
  pdf.setFontSize(12)
  pdf.setFont(undefined, 'normal')
  pdf.text(title || 'Comprehensive App Analytics', 20, 72)

  // Report details box
  pdf.setFillColor(...COLORS.lightGray)
  pdf.roundedRect(20, 105, pageWidth - 40, 50, 4, 4, 'F')

  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(11)
  pdf.setFont(undefined, 'bold')
  pdf.text('Report Details', 28, 120)

  pdf.setFont(undefined, 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...COLORS.gray)

  const now = new Date()
  pdf.text(`Generated: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 28, 133)
  pdf.text(`Time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, 28, 144)

  // Categories section
  pdf.setFontSize(11)
  pdf.setTextColor(...COLORS.primary)
  pdf.setFont(undefined, 'bold')
  pdf.text('Report Sections', 20, 175)

  pdf.setFont(undefined, 'normal')
  pdf.setFontSize(10)

  const categories = [
    ['User Activity', 'AI Usage'],
    ['Screen Engagement', 'Chat Activity'],
    ['Feed Activity', 'Directory Usage'],
    ['Library Assets', 'Notifications'],
    ['Training Assets', 'Growth & Retention'],
    ['Downloads', '']
  ]

  let y = 188
  categories.forEach(row => {
    // Left item
    pdf.setFillColor(...COLORS.accent)
    pdf.circle(24, y - 1.5, 1.5, 'F')
    pdf.setTextColor(...COLORS.primary)
    pdf.text(row[0], 30, y)

    // Right item
    if (row[1]) {
      pdf.setFillColor(...COLORS.accent)
      pdf.circle(pageWidth / 2 + 4, y - 1.5, 1.5, 'F')
      pdf.text(row[1], pageWidth / 2 + 10, y)
    }
    y += 11
  })

  // Footer
  pdf.setDrawColor(...COLORS.lightGray)
  pdf.setLineWidth(0.5)
  pdf.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25)

  pdf.setFontSize(9)
  pdf.setTextColor(...COLORS.gray)
  pdf.text('Powered by ConveyMed Analytics Platform', pageWidth / 2, pageHeight - 15, { align: 'center' })
}

// Add executive summary
function addExecutiveSummary(pdf, sections, yStart) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  let y = yStart

  // Section header
  pdf.setFillColor(...COLORS.primary)
  pdf.rect(20, y, pageWidth - 40, 10, 'F')
  pdf.setTextColor(...COLORS.white)
  pdf.setFontSize(14)
  pdf.setFont(undefined, 'bold')
  pdf.text('Executive Summary', 25, y + 7)
  y += 20

  // Calculate key metrics from sections
  const userActivity = sections.find(s => s.id === 'userActivity')
  const feedActivity = sections.find(s => s.id === 'feedActivity')
  const notifications = sections.find(s => s.id === 'notifications')

  // Metric boxes
  const boxWidth = (pageWidth - 60) / 4
  const boxHeight = 40

  const summaryMetrics = []

  if (userActivity?.stats) {
    const total = userActivity.stats.find(s => s.title === 'Total Users')
    const active = userActivity.stats.find(s => s.title === 'Active Users')
    const rate = userActivity.stats.find(s => s.title === 'Engagement Rate')
    if (total) summaryMetrics.push({ label: 'Total Users', value: total.value, color: COLORS.accent })
    if (active) summaryMetrics.push({ label: 'Active Users', value: active.value, color: COLORS.success })
    if (rate) summaryMetrics.push({ label: 'Engagement', value: rate.value, color: COLORS.warning })
  }

  if (feedActivity?.stats) {
    const posts = feedActivity.stats.find(s => s.title === 'Total Posts')
    if (posts) summaryMetrics.push({ label: 'Total Posts', value: posts.value, color: COLORS.primary })
  }

  // Draw metric boxes
  summaryMetrics.slice(0, 4).forEach((metric, i) => {
    const bx = 20 + (i * (boxWidth + 6.67))

    pdf.setFillColor(...COLORS.lightGray)
    pdf.roundedRect(bx, y, boxWidth, boxHeight, 3, 3, 'F')

    // Colored top bar
    pdf.setFillColor(...metric.color)
    pdf.rect(bx, y, boxWidth, 4, 'F')

    pdf.setTextColor(...COLORS.primary)
    pdf.setFontSize(20)
    pdf.setFont(undefined, 'bold')
    pdf.text(String(metric.value), bx + boxWidth / 2, y + 22, { align: 'center' })

    pdf.setTextColor(...COLORS.gray)
    pdf.setFontSize(9)
    pdf.setFont(undefined, 'normal')
    pdf.text(metric.label, bx + boxWidth / 2, y + 34, { align: 'center' })
  })

  return y + boxHeight + 20
}

// Add section with stats and table - each section starts on a new page
function addSection(pdf, section, yStart, isFirst = false) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  let y = yStart

  // Each section starts on a new page for clean layout
  if (!isFirst) {
    pdf.addPage()
    y = 30
  }

  // Section header with colored bar
  pdf.setFillColor(...COLORS.accent)
  pdf.rect(20, y, 4, 12, 'F')

  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(16)
  pdf.setFont(undefined, 'bold')
  pdf.text(section.title, 28, y + 9)
  y += 20

  // Stats in a nice grid
  if (section.stats && section.stats.length > 0) {
    const statsPerRow = Math.min(section.stats.length, 3)
    const statWidth = (pageWidth - 50) / statsPerRow

    section.stats.forEach((stat, i) => {
      const row = Math.floor(i / statsPerRow)
      const col = i % statsPerRow
      const sx = 25 + (col * statWidth)
      const sy = y + (row * 20)

      pdf.setFontSize(10)
      pdf.setTextColor(...COLORS.gray)
      pdf.text(stat.title + ':', sx, sy)

      pdf.setTextColor(...COLORS.primary)
      pdf.setFont(undefined, 'bold')
      pdf.text(String(stat.value), sx + pdf.getTextWidth(stat.title + ': '), sy)
      pdf.setFont(undefined, 'normal')
    })

    const rows = Math.ceil(section.stats.length / statsPerRow)
    y += (rows * 20) + 10
  }

  // Table data
  if (section.tableData && section.tableData.length > 0 && section.columns) {
    pdf.autoTable({
      startY: y,
      head: [section.columns.map(col => col.label)],
      body: section.tableData.map(row =>
        section.columns.map(col => {
          const val = row[col.key]
          return val !== undefined && val !== null ? String(val) : '-'
        })
      ),
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: COLORS.lightGray
      },
      columnStyles: {
        0: { cellWidth: 'auto' }
      }
    })

    y = pdf.lastAutoTable.finalY + 15
  } else {
    y += 5
  }

  return y
}

// Generate standalone landscape PDF for user report
export function generateUserReportPDF(userReportRows, options = {}) {
  if (!userReportRows || userReportRows.length === 0) return null

  const { companyName = 'ConveyMed', dateRange, categories = [], screenNames = [] } = options
  const USER_REPORT_COLUMNS = buildUserReportColumns(screenNames, categories)
  const USER_REPORT_GROUPS = buildUserReportGroups(screenNames, categories)
  const pdf = new jsPDF({ orientation: 'landscape' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Cover header bar
  pdf.setFillColor(...COLORS.primary)
  pdf.rect(0, 0, pageWidth, 50, 'F')

  pdf.setFontSize(10)
  pdf.setTextColor(...COLORS.white)
  pdf.setFont(undefined, 'normal')
  pdf.text((companyName || 'CONVEYMED').toUpperCase(), 20, 20)

  pdf.setFontSize(22)
  pdf.setFont(undefined, 'bold')
  pdf.text('Individual User Report', 20, 38)

  // Metadata
  let y = 65
  pdf.setTextColor(...COLORS.gray)
  pdf.setFontSize(10)
  pdf.setFont(undefined, 'normal')
  const now = new Date()
  pdf.text(`Generated: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 20, y)
  if (dateRange) {
    pdf.text(`Date Range: ${dateRange}`, 20, y + 12)
    y += 12
  }
  pdf.text(`Total Users: ${userReportRows.length}`, 20, y + 12)
  y += 26

  // Abbreviation map: full label -> short label for PDF columns
  const ABBR = {
    'Name': 'Name',
    'Total Sessions': 'Sess',
    'Duration (min)': 'Dur',
    'Avg Session (min)': 'Avg',
    'Screen Views Total': 'Scr Tot',
    'Total Assets': 'Ast Tot',
  }
  // Auto-generate abbreviations for dynamic screen names and categories
  const autoAbbrev = (label) => {
    const words = label.split(/[\s\-&]+/).filter(w => w.length > 0)
    return words.length > 1
      ? words.map(w => w[0].toUpperCase()).join('').slice(0, 4)
      : label.slice(0, 6)
  }
  screenNames.forEach(s => { ABBR[s] = autoAbbrev(s) })
  categories.forEach(cat => {
    ABBR[cat] = autoAbbrev(cat)
  })

  // Build legend entries (only where abbr differs from label)
  const legendEntries = USER_REPORT_COLUMNS
    .filter(c => ABBR[c.label] && ABBR[c.label] !== c.label)
    .map(c => ({ abbr: ABBR[c.label], full: c.label }))

  // Draw legend box
  const legendMargin = 20
  const legendTitle = 'Legend'
  pdf.setFontSize(9)
  pdf.setFont(undefined, 'bold')
  pdf.setTextColor(...COLORS.primary)
  pdf.text(legendTitle, legendMargin, y)
  y += 6

  // Layout legend in columns to keep it compact
  const legendColWidth = 62
  const legendLineHeight = 8
  const legendCols = 4
  const legendRows = Math.ceil(legendEntries.length / legendCols)

  // Light background
  const legendBoxHeight = legendRows * legendLineHeight + 6
  pdf.setFillColor(...COLORS.lightGray)
  pdf.roundedRect(legendMargin - 4, y - 4, legendCols * legendColWidth + 8, legendBoxHeight, 2, 2, 'F')

  legendEntries.forEach((entry, i) => {
    const col = Math.floor(i / legendRows)
    const row = i % legendRows
    const lx = legendMargin + col * legendColWidth
    const ly = y + row * legendLineHeight

    pdf.setFontSize(7)
    pdf.setFont(undefined, 'bold')
    pdf.setTextColor(...COLORS.accent)
    pdf.text(entry.abbr, lx, ly)

    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(...COLORS.gray)
    pdf.text(` = ${entry.full}`, lx + pdf.getTextWidth(entry.abbr), ly)
  })

  // Start table on page 2
  pdf.addPage('landscape')
  y = 25

  // Column headers using abbreviations
  const columnLabels = USER_REPORT_COLUMNS.map(c => ABBR[c.label] || c.label)

  // Table body
  const body = userReportRows.map(row =>
    USER_REPORT_COLUMNS.map(c => {
      const val = row[c.key]
      return val !== undefined && val !== null ? String(val) : '0'
    })
  )

  // Draw merged group header row manually, then table below it
  const tableMargin = 15
  const usableWidth = pageWidth - tableMargin * 2
  const nameColWidth = 32
  const totalCols = USER_REPORT_COLUMNS.length
  const remainingWidth = usableWidth - nameColWidth
  const colWidth = remainingWidth / (totalCols - 1)
  const groupRowHeight = 14

  // Draw group header cells
  let gx = tableMargin
  let colIndex = 0
  USER_REPORT_GROUPS.forEach(g => {
    let cellWidth = 0
    for (let i = 0; i < g.span; i++) {
      cellWidth += (colIndex + i === 0) ? nameColWidth : colWidth
    }

    // Fill
    pdf.setFillColor(...COLORS.primary)
    pdf.rect(gx, y, cellWidth, groupRowHeight, 'F')

    // Border
    pdf.setDrawColor(226, 232, 240)
    pdf.setLineWidth(0.1)
    pdf.rect(gx, y, cellWidth, groupRowHeight, 'S')

    // Centered text
    pdf.setTextColor(...COLORS.white)
    pdf.setFontSize(8)
    pdf.setFont(undefined, 'bold')
    pdf.text(g.label, gx + cellWidth / 2, y + groupRowHeight / 2 + 1.5, { align: 'center' })

    gx += cellWidth
    colIndex += g.span
  })

  y += groupRowHeight

  pdf.autoTable({
    startY: y,
    head: [columnLabels],
    body: body,
    margin: { left: tableMargin, right: tableMargin },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: COLORS.accent,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray
    },
    tableWidth: 'auto',
    columnStyles: {
      0: { cellWidth: nameColWidth }
    }
  })

  // Page numbers on all pages
  const totalPages = pdf.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    const pw = pdf.internal.pageSize.getWidth()
    const ph = pdf.internal.pageSize.getHeight()

    // Skip header on first page (has cover bar)
    if (i > 1) {
      pdf.setDrawColor(...COLORS.accent)
      pdf.setLineWidth(0.5)
      pdf.line(15, 12, pw - 15, 12)
      pdf.setFontSize(9)
      pdf.setTextColor(...COLORS.gray)
      pdf.text(`${companyName} - Individual User Report`, 15, 9)
    }

    // Page number
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.gray)
    pdf.text(`Page ${i} of ${totalPages}`, pw - 15, 9, { align: 'right' })

    // Footer
    pdf.setDrawColor(...COLORS.accent)
    pdf.setLineWidth(0.5)
    pdf.line(15, ph - 12, pw - 15, ph - 12)
    pdf.text('Confidential - For Internal Use Only', pw / 2, ph - 7, { align: 'center' })
  }

  return pdf
}

// Download user report as standalone landscape PDF
export function downloadUserReportPDF(userReportRows, filename, options = {}) {
  const pdf = generateUserReportPDF(userReportRows, options)
  if (pdf) {
    pdf.save(`${filename}_user-report.pdf`)
  }
}

// Generate premium PDF report (portrait, no user report)
export function generatePDF(sections, title = 'Analytics Report', options = {}) {
  const pdf = new jsPDF()
  const { companyName = 'ConveyMed', dateRange } = options

  // Cover page
  addCoverPage(pdf, title, dateRange, companyName)

  // Start content pages
  pdf.addPage()
  let y = 30

  // Executive Summary
  y = addExecutiveSummary(pdf, sections, y)

  // Add each section
  sections.forEach((section, index) => {
    y = addSection(pdf, section, y, index === 0)
  })

  // Add page numbers to all pages except cover
  const totalPages = pdf.internal.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i)
    addPageHeader(pdf, i - 1, totalPages - 1, companyName)
  }

  return pdf
}

// Download PDF
export function downloadPDF(sections, filename, title, options = {}) {
  const pdf = generatePDF(sections, title, options)
  pdf.save(`${filename}.pdf`)
}
