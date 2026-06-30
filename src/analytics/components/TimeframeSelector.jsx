import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useAppContext, TIMEFRAMES } from '../context/AppContext'

export default function TimeframeSelector({ onApply }) {
  const {
    timeframe,
    setTimeframe,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate
  } = useAppContext()

  const handleApply = () => {
    if (onApply) onApply()
  }

  return (
    <div style={styles.container}>
      <div style={styles.selectWrapper}>
        <label style={styles.label}>Timeframe</label>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          style={styles.select}
        >
          {Object.entries(TIMEFRAMES).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {timeframe === 'custom' && (
        <div style={styles.dateRange}>
          <div style={styles.dateWrapper}>
            <label style={styles.label}>Start Date</label>
            <DatePicker
              selected={customStartDate}
              onChange={setCustomStartDate}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              maxDate={new Date()}
              placeholderText="Select start date"
            />
          </div>
          <div style={styles.dateWrapper}>
            <label style={styles.label}>End Date</label>
            <DatePicker
              selected={customEndDate}
              onChange={setCustomEndDate}
              selectsEnd
              startDate={customStartDate}
              endDate={customEndDate}
              minDate={customStartDate}
              maxDate={new Date()}
              placeholderText="Select end date"
            />
          </div>
        </div>
      )}

      <button onClick={handleApply} style={styles.applyButton}>
        Apply
      </button>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '16px',
    flexWrap: 'wrap'
  },
  selectWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  select: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    minWidth: '140px',
    cursor: 'pointer'
  },
  dateRange: {
    display: 'flex',
    gap: '12px'
  },
  dateWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  applyButton: {
    padding: '10px 24px',
    borderRadius: '8px',
    backgroundColor: 'var(--accent)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
}
