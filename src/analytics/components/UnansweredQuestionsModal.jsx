import { useEffect } from 'react'
import { HiOutlineX } from 'react-icons/hi'
import useUnansweredQuestions from '../hooks/useUnansweredQuestions'
import DataTable from './charts/DataTable'

const formatDate = (iso) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    })
  } catch {
    return iso
  }
}

export default function UnansweredQuestionsModal({ isOpen, onClose }) {
  const { data, loading, error, fetchData } = useUnansweredQuestions()

  useEffect(() => {
    if (isOpen) fetchData()
  }, [isOpen, fetchData])

  if (!isOpen) return null

  const columns = [
    { key: 'askedAt', label: 'When', render: (v) => formatDate(v) },
    { key: 'question', label: 'Question' },
    { key: 'product', label: 'Product' },
    { key: 'askedBy', label: 'Asked by' },
    { key: 'email', label: 'Email' },
  ]

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Unanswered Questions</h2>
            <p style={styles.subtitle}>
              Questions where the AI returned confidence: none — likely missing or unclear in the documentation.
            </p>
          </div>
          <button onClick={onClose} style={styles.closeButton} aria-label="Close">
            <HiOutlineX />
          </button>
        </div>

        <div style={styles.content}>
          {loading && <div style={styles.empty}>Loading…</div>}
          {error && <div style={styles.error}>Error: {error}</div>}
          {!loading && !error && data && (
            <>
              <div style={styles.summary}>
                <div style={styles.statBlock}>
                  <span style={styles.statValue}>{data.total}</span>
                  <span style={styles.statLabel}>Total unanswered</span>
                </div>
                {data.topProducts.length > 0 && (
                  <div style={styles.topProducts}>
                    <span style={styles.statLabel}>Top products with gaps:</span>
                    <div style={styles.pills}>
                      {data.topProducts.map(p => (
                        <span key={p.product} style={styles.pill}>
                          {p.product} <strong>×{p.count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DataTable
                columns={columns}
                data={data.rows}
                defaultSortColumn="askedAt"
                defaultSortDirection="desc"
              />
            </>
          )}
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>Close</button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '960px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
    gap: '12px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: '4px 0 0 0',
  },
  closeButton: {
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '20px',
    display: 'flex',
  },
  content: {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1,
  },
  summary: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '20px',
  },
  statBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  topProducts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  pills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  pill: {
    padding: '4px 10px',
    borderRadius: '999px',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  error: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    fontSize: '13px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
}
