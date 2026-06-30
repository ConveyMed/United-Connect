import { HiOutlineTrendingUp, HiOutlineTrendingDown } from 'react-icons/hi'

export default function StatCard({ title, value, subtitle, trend, trendValue, icon: Icon }) {
  const isPositive = trend === 'up'
  const isNegative = trend === 'down'

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        {Icon && <Icon style={styles.icon} />}
      </div>
      <div style={styles.value}>{value}</div>
      {(subtitle || trendValue) && (
        <div style={styles.footer}>
          {trendValue && (
            <span style={{
              ...styles.trend,
              color: isPositive ? 'var(--success)' : isNegative ? 'var(--error)' : 'var(--text-secondary)'
            }}>
              {isPositive && <HiOutlineTrendingUp style={styles.trendIcon} />}
              {isNegative && <HiOutlineTrendingDown style={styles.trendIcon} />}
              {trendValue}
            </span>
          )}
          {subtitle && <span style={styles.subtitle}>{subtitle}</span>}
        </div>
      )}
    </div>
  )
}

const styles = {
  card: {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-secondary)'
  },
  icon: {
    fontSize: '20px',
    color: 'var(--accent)'
  },
  value: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px'
  },
  trend: {
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '2px'
  },
  trendIcon: {
    fontSize: '14px'
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)'
  }
}
