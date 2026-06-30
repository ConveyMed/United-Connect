import { useEffect, useState, useCallback } from 'react'
import { HiOutlineUser, HiOutlineClock, HiOutlineEye, HiOutlineDownload, HiOutlineFolder, HiOutlineDocument } from 'react-icons/hi'
import TimeframeSelector from '../../components/TimeframeSelector'
import DataTable from '../../components/charts/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import useUserReport from '../../hooks/useUserReport'
import { formatNumber } from '../../components/export/exportUtils'

// Build flat column definitions for the spreadsheet-style export
function buildFlatColumns(screenNames, categories, assetNames) {
  return [
    { key: 'name', label: 'Name' },
    { key: 'totalSessions', label: 'Total Sessions' },
    { key: 'totalDurationMin', label: 'Duration (min)' },
    { key: 'avgSessionMin', label: 'Avg Session (min)' },
    ...screenNames.map(s => ({ key: `screen_${s}`, label: s })),
    { key: 'screenViewsTotal', label: 'Screen Views Total' },
    { key: 'totalAssets', label: 'Total Assets' },
    ...categories.map(a => ({ key: `asset_${a}`, label: a })),
    ...(assetNames || []).map(a => ({ key: `assetname_${a}`, label: a })),
  ]
}

// Group headers for CSV/Excel
function buildGroupHeaders(screenNames, categories, assetNames) {
  const headers = [
    { label: 'Individual User Activity Report', span: 4 },
    { label: 'Screens Visited', span: screenNames.length + 1 },
    { label: 'Categories', span: categories.length + 1 },
  ]
  if (assetNames && assetNames.length > 0) {
    headers.push({ label: 'Asset Names', span: assetNames.length })
  }
  return headers
}

function escapeCSV(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildFlatCSV(rows, screenNames, categories, assetNames) {
  const FLAT_COLUMNS = buildFlatColumns(screenNames, categories, assetNames)
  const GROUP_HEADERS = buildGroupHeaders(screenNames, categories, assetNames)
  const BOM = '\uFEFF'
  let csv = ''

  // Group header row
  const groupCells = []
  GROUP_HEADERS.forEach(g => {
    groupCells.push(escapeCSV(g.label))
    for (let i = 1; i < g.span; i++) groupCells.push('')
  })
  csv += groupCells.join(',') + '\n'

  // Column header row
  csv += FLAT_COLUMNS.map(c => escapeCSV(c.label)).join(',') + '\n'

  // Data rows
  rows.forEach(row => {
    csv += FLAT_COLUMNS.map(c => escapeCSV(row[c.key])).join(',') + '\n'
  })

  return BOM + csv
}

async function buildFlatExcel(rows, filename, screenNames, categories, assetNames) {
  const FLAT_COLUMNS = buildFlatColumns(screenNames, categories, assetNames)
  const GROUP_HEADERS = buildGroupHeaders(screenNames, categories, assetNames)
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'ConveyMed'
  workbook.created = new Date()

  const ws = workbook.addWorksheet('User Report')

  // Row 1: Group headers (merged cells)
  let col = 1
  GROUP_HEADERS.forEach(g => {
    const startCol = col
    const endCol = col + g.span - 1
    if (g.span > 1) {
      ws.mergeCells(1, startCol, 1, endCol)
    }
    const cell = ws.getCell(1, startCol)
    cell.value = g.label
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2A35' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    // Fill remaining cells in merge with same style
    for (let c = startCol; c <= endCol; c++) {
      const mergedCell = ws.getCell(1, c)
      mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2A35' } }
      mergedCell.border = { right: { style: 'thin', color: { argb: 'FF64748B' } } }
    }
    col = endCol + 1
  })
  ws.getRow(1).height = 26

  // Row 2: Column headers
  FLAT_COLUMNS.forEach((c, i) => {
    const cell = ws.getCell(2, i + 1)
    cell.value = c.label
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
    cell.alignment = { vertical: 'middle' }
  })
  ws.getRow(2).height = 24

  // Data rows
  rows.forEach((row, ri) => {
    const r = ws.getRow(3 + ri)
    FLAT_COLUMNS.forEach((c, ci) => {
      const cell = r.getCell(ci + 1)
      cell.value = row[c.key] !== undefined ? row[c.key] : 0
      cell.font = { size: 10 }
      if (ri % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
      }
    })
    r.height = 22
  })

  // Auto-fit columns
  ws.columns.forEach(col => {
    let maxLen = 10
    col.eachCell({ includeEmpty: false }, cell => {
      const val = cell.value ? String(cell.value) : ''
      maxLen = Math.max(maxLen, val.length + 2)
    })
    col.width = Math.min(maxLen, 30)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function downloadFlatCSV(rows, filename, screenNames, categories, assetNames) {
  const csv = buildFlatCSV(rows, screenNames, categories, assetNames)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function UserReport() {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [exportingAll, setExportingAll] = useState(false)
  const { data, loading, error, users, fetchUsers, fetchUserData, fetchAllUsersData } = useUserReport()

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleUserChange = (e) => {
    const userId = e.target.value
    setSelectedUserId(userId)
    if (userId) {
      fetchUserData(userId)
    }
  }

  const handleApply = () => {
    if (selectedUserId) {
      fetchUserData(selectedUserId)
    }
  }

  const userName = data?.profile
    ? (data.profile.first_name && data.profile.last_name
      ? `${data.profile.first_name} ${data.profile.last_name}`
      : data.profile.email || 'Unknown')
    : ''

  // Export single user (flat row)
  const handleExportCSV = () => {
    if (!data?.flatRow) return
    const safeName = userName.replace(/\s+/g, '-').toLowerCase()
    downloadFlatCSV([data.flatRow], `user-report-${safeName}`, data.screenNames || [], data.categories || [], data.allAssetNames || [])
  }

  const handleExportExcel = async () => {
    if (!data?.flatRow) return
    const safeName = userName.replace(/\s+/g, '-').toLowerCase()
    await buildFlatExcel([data.flatRow], `user-report-${safeName}`, data.screenNames || [], data.categories || [], data.allAssetNames || [])
  }

  // Export ALL users (flat rows)
  const handleExportAllCSV = async () => {
    setExportingAll(true)
    try {
      const { rows, categories, screenNames, assetNames } = await fetchAllUsersData()
      if (rows.length > 0) downloadFlatCSV(rows, 'all-users-report', screenNames, categories, assetNames || [])
    } finally {
      setExportingAll(false)
    }
  }

  const handleExportAllExcel = async () => {
    setExportingAll(true)
    try {
      const { rows, categories, screenNames, assetNames } = await fetchAllUsersData()
      if (rows.length > 0) await buildFlatExcel(rows, 'all-users-report', screenNames, categories, assetNames || [])
    } finally {
      setExportingAll(false)
    }
  }

  const screenColumns = [
    { key: 'screen', label: 'Screen' },
    { key: 'count', label: 'Views', align: 'right' }
  ]

  const assetColumns = [
    { key: 'asset', label: 'Asset' },
    { key: 'count', label: 'Clicks', align: 'right' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User Report</h1>
          <p style={styles.subtitle}>Individual user activity breakdown</p>
        </div>
        <div style={styles.headerControls}>
          <TimeframeSelector onApply={handleApply} />
          {data && selectedUserId && (
            <div style={styles.exportGroup}>
              <button onClick={handleExportExcel} style={styles.exportBtn}>Export User (Excel)</button>
              <button onClick={handleExportCSV} style={styles.exportBtn}>Export User (CSV)</button>
            </div>
          )}
          <div style={styles.exportGroup}>
            <button onClick={handleExportAllExcel} style={styles.exportBtnAll} disabled={exportingAll}>
              {exportingAll ? 'Exporting...' : 'All Users (Excel)'}
            </button>
            <button onClick={handleExportAllCSV} style={styles.exportBtnAll} disabled={exportingAll}>
              {exportingAll ? 'Exporting...' : 'All Users (CSV)'}
            </button>
          </div>
        </div>
      </div>

      <div style={styles.userSelector}>
        <label style={styles.label}>Select User</label>
        <select
          value={selectedUserId}
          onChange={handleUserChange}
          style={styles.select}
        >
          <option value="">-- Choose a user --</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email || user.id}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={styles.error}>Error: {error}</div>
      )}

      {!selectedUserId && (
        <div style={styles.empty}>
          Select a user from the dropdown to view their activity report.
        </div>
      )}

      {loading && selectedUserId ? (
        <LoadingSpinner />
      ) : data && selectedUserId ? (
        <>
          {/* Section 1: Individual User Activity Report */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <HiOutlineUser style={styles.sectionIcon} />
              <h2 style={styles.sectionTitle}>Individual User Activity Report</h2>
            </div>
            <div style={styles.profileCard}>
              <div style={styles.profileInfo}>
                <h3 style={styles.profileName}>{userName}</h3>
                {data.profile?.email && (
                  <p style={styles.profileEmail}>{data.profile.email}</p>
                )}
              </div>
            </div>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Total Sessions</span>
                <span style={styles.statValue}>{formatNumber(data.totalSessions)}</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Duration (min)</span>
                <span style={styles.statValue}>{formatNumber(data.totalDurationMin)}</span>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Avg Session (min)</span>
                <span style={styles.statValue}>{formatNumber(data.avgSessionMin)}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Screens Visited */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <HiOutlineEye style={styles.sectionIcon} />
              <h2 style={styles.sectionTitle}>Screens Visited</h2>
              <span style={styles.sectionTotal}>{formatNumber(data.totalScreenViews)} total views</span>
            </div>
            <DataTable
              columns={screenColumns}
              data={data.screenRows}
              defaultSortColumn="count"
            />
          </div>

          {/* Section 3: Categories */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <HiOutlineFolder style={styles.sectionIcon} />
              <h2 style={styles.sectionTitle}>Categories</h2>
              <span style={styles.sectionTotal}>{formatNumber(data.totalAssetClicks)} total</span>
            </div>
            <DataTable
              columns={assetColumns}
              data={data.categoryRows}
              defaultSortColumn="count"
            />
          </div>

          {/* Section 4: Asset Names */}
          {data.assetNameRows && data.assetNameRows.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <HiOutlineDocument style={styles.sectionIcon} />
                <h2 style={styles.sectionTitle}>Asset Names</h2>
                <span style={styles.sectionTotal}>{formatNumber(data.assetNameRows.length)} items</span>
              </div>
              <DataTable
                columns={assetColumns}
                data={data.assetNameRows}
                defaultSortColumn="asset"
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1400px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerControls: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    flexWrap: 'wrap'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px'
  },
  exportGroup: {
    display: 'flex',
    gap: '6px'
  },
  exportBtn: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  exportBtnAll: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid var(--accent)',
    backgroundColor: 'var(--accent)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  userSelector: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '6px'
  },
  select: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '15px',
    minWidth: '300px',
    cursor: 'pointer'
  },
  error: {
    padding: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--error)',
    borderRadius: '8px',
    color: 'var(--error)',
    marginBottom: '24px'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)'
  },
  // Sections
  section: {
    marginBottom: '28px'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '2px solid var(--accent)'
  },
  sectionIcon: {
    fontSize: '22px',
    color: 'var(--accent)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  sectionTotal: {
    marginLeft: 'auto',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    backgroundColor: 'var(--bg-surface)',
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1px solid var(--border)'
  },
  // Profile card
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    marginBottom: '16px'
  },
  profileInfo: {},
  profileName: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  profileEmail: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: '2px 0 0 0'
  },
  // Stats grid
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px'
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 20px',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)'
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary)'
  }
}
