import { useState } from 'react'
import { HiOutlineChevronUp, HiOutlineChevronDown } from 'react-icons/hi'

export default function DataTable({
  title,
  columns,
  data,
  defaultSortColumn = null,
  defaultSortDirection = 'desc'
}) {
  const [sortColumn, setSortColumn] = useState(defaultSortColumn || columns[0]?.key)
  const [sortDirection, setSortDirection] = useState(defaultSortDirection)

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('desc')
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0

    const aVal = a[sortColumn]
    const bVal = b[sortColumn]

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    }

    const aStr = String(aVal || '').toLowerCase()
    const bStr = String(bVal || '').toLowerCase()

    if (sortDirection === 'asc') {
      return aStr.localeCompare(bStr)
    }
    return bStr.localeCompare(aStr)
  })

  return (
    <div style={styles.container}>
      {title && <h3 style={styles.title}>{title}</h3>}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...styles.th,
                    cursor: 'pointer',
                    textAlign: col.align || 'left'
                  }}
                  onClick={() => handleSort(col.key)}
                >
                  <span style={styles.thContent}>
                    {col.label}
                    {sortColumn === col.key && (
                      sortDirection === 'asc'
                        ? <HiOutlineChevronUp style={styles.sortIcon} />
                        : <HiOutlineChevronDown style={styles.sortIcon} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={styles.empty}>
                  No data available
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr key={row.id || index} style={styles.tr}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        ...styles.td,
                        textAlign: col.align || 'left'
                      }}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  container: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--border)',
    overflow: 'hidden'
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '16px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    borderBottom: '2px solid var(--border)',
    backgroundColor: 'var(--bg-primary)',
    whiteSpace: 'nowrap'
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  sortIcon: {
    fontSize: '14px'
  },
  tr: {
    borderBottom: '1px solid var(--border)'
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: 'var(--text-primary)'
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px'
  }
}
