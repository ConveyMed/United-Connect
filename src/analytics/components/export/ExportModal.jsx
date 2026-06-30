import { useState } from 'react'
import { HiOutlineX, HiOutlineUsers } from 'react-icons/hi'

const EXPORT_SECTIONS = [
  { id: 'userActivity', label: 'User Activity' },
  { id: 'screenEngagement', label: 'Screen Engagement' },
  { id: 'feedActivity', label: 'Feed Activity' },
  { id: 'libraryAssets', label: 'Library Assets' },
  { id: 'trainingAssets', label: 'Training Assets' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'aiUsage', label: 'AI Usage' },
  { id: 'chatActivity', label: 'Chat Activity' },
  { id: 'directoryUsage', label: 'Directory Usage' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'growthRetention', label: 'Growth & Retention' }
]

export default function ExportModal({ isOpen, onClose, onExport, loading }) {
  const [selectedSections, setSelectedSections] = useState(
    EXPORT_SECTIONS.map(s => s.id)
  )
  const [includeUserReport, setIncludeUserReport] = useState(true)

  if (!isOpen) return null

  const toggleSection = (id) => {
    setSelectedSections(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    )
  }

  const selectAll = () => setSelectedSections(EXPORT_SECTIONS.map(s => s.id))
  const selectNone = () => setSelectedSections([])

  const handleExport = () => {
    onExport({
      sections: selectedSections,
      format: 'excel',
      includeUserReport: includeUserReport
    })
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Export to Excel</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <HiOutlineX />
          </button>
        </div>

        <div style={styles.content}>
          <label style={styles.rosterCheckbox}>
            <input
              type="checkbox"
              checked={includeUserReport}
              onChange={(e) => setIncludeUserReport(e.target.checked)}
              style={styles.checkboxInput}
            />
            <HiOutlineUsers style={styles.rosterIcon} />
            <span>Include Individual User Report</span>
          </label>

          <div style={styles.sectionsHeader}>
            <label style={styles.label}>Include Sections</label>
            <div style={styles.selectLinks}>
              <button onClick={selectAll} style={styles.link}>Select All</button>
              <span style={styles.divider}>|</span>
              <button onClick={selectNone} style={styles.link}>Select None</button>
            </div>
          </div>

          <div style={styles.sections}>
            {EXPORT_SECTIONS.map(section => (
              <label key={section.id} style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selectedSections.includes(section.id)}
                  onChange={() => toggleSection(section.id)}
                  style={styles.checkboxInput}
                />
                <span style={styles.checkboxLabel}>{section.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={selectedSections.length === 0 || loading}
            style={{
              ...styles.exportButton,
              ...(selectedSections.length === 0 || loading ? styles.exportButtonDisabled : {})
            }}
          >
            {loading ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '480px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0
  },
  closeButton: {
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '20px',
    display: 'flex'
  },
  content: {
    padding: '24px',
    overflowY: 'auto'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  sectionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  selectLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    fontSize: '13px',
    cursor: 'pointer',
    padding: 0
  },
  divider: {
    color: 'var(--border)'
  },
  sections: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    cursor: 'pointer'
  },
  checkboxInput: {
    width: '16px',
    height: '16px',
    accentColor: 'var(--accent)'
  },
  checkboxLabel: {
    fontSize: '13px',
    color: 'var(--text-primary)'
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid var(--border)'
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  exportButton: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  exportButtonDisabled: {
    backgroundColor: 'var(--border)',
    cursor: 'not-allowed'
  },
  rosterCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    padding: '8px 0',
    marginBottom: '16px'
  },
  rosterIcon: {
    fontSize: '16px',
    color: 'var(--accent)'
  }
}
