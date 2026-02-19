import { useTheme } from '../context/ThemeContext';

function PlateFailurePanel({ plate, failedBinIds, onToggleBin, onRepack }) {
  const { colors } = useTheme();

  const failedCount = failedBinIds.length;
  const totalCount = plate.items.length;

  return (
    <div style={{
      background: colors.background,
      border: `2px solid ${colors.danger}`,
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '0.75rem'
    }}>
      <h5 style={{
        margin: '0 0 0.75rem 0',
        color: colors.danger,
        fontSize: '0.875rem'
      }}>
        Mark which bins failed ({failedCount} of {totalCount} failed)
      </h5>

      <div style={{ marginBottom: '0.75rem' }}>
        {plate.items.map((item, idx) => {
          const isFailed = failedBinIds.includes(idx);
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem',
                marginBottom: '0.25rem',
                background: isFailed ? `${colors.danger}15` : `${colors.success}15`,
                borderRadius: '4px',
                border: `1px solid ${isFailed ? colors.danger : colors.success}`,
              }}
            >
              <span style={{
                color: colors.text,
                fontSize: '0.875rem',
                textDecoration: !isFailed ? 'line-through' : 'none',
                opacity: !isFailed ? 0.6 : 1
              }}>
                {item.binData.type === 'hollow' ? 'Hollow' : 'Solid'} bin{' '}
                {item.binData.width}x{item.binData.depth}x{item.binData.height}
                {item.label && item.label !== `${item.binData.type} bin` && (
                  <span style={{ color: colors.textSecondary }}> ({item.label})</span>
                )}
              </span>

              <button
                onClick={() => onToggleBin(idx, !isFailed)}
                style={{
                  padding: '0.25rem 0.75rem',
                  background: isFailed ? colors.success : colors.danger,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                {isFailed ? 'Mark OK' : 'Mark Failed'}
              </button>
            </div>
          );
        })}
      </div>

      {onRepack && failedCount > 0 && (
        <button
          onClick={onRepack}
          style={{
            width: '100%',
            padding: '0.625rem',
            background: colors.warning,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.875rem'
          }}
        >
          Repack {failedCount} Failed Bin{failedCount === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );
}

export default PlateFailurePanel;
