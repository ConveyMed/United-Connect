const StaleAccountIndicator = ({ daysSinceActivity }) => {
  if (daysSinceActivity === null || daysSinceActivity === undefined) return null;
  if (daysSinceActivity < 7) return null;

  const isRed = daysSinceActivity >= 14;
  const color = isRed ? '#dc2626' : '#d97706';
  const bgColor = isRed ? '#fef2f2' : '#fefce8';

  return (
    <span style={{
      fontSize: '10px',
      fontWeight: '600',
      color,
      backgroundColor: bgColor,
      padding: '2px 6px',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
    }}>
      {daysSinceActivity}d idle
    </span>
  );
};

export default StaleAccountIndicator;
