import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import PlatePreview3D from './PlatePreview3D';
import PlateFailurePanel from './PlateFailurePanel';

function PlateCard({ plate, onStatusChange, onExport, onMarkBinFailed, onRepackFailed }) {
  const { colors } = useTheme();
  const [showItems, setShowItems] = useState(false);

  const statusColors = {
    none: colors.input,
    printing: colors.warning,
    done: colors.success,
    failed: colors.danger
  };

  const statusLabels = {
    none: 'Not Started',
    printing: 'Printing',
    done: 'Done',
    failed: 'Failed'
  };

  const failedBinIds = plate.status === 'failed'
    ? plate.items.map((item, idx) => item.status === 'failed' ? idx : null).filter(i => i !== null)
    : [];

  const handleStatusChange = (e) => {
    onStatusChange(plate.id, e.target.value);
  };

  const getStatusStyle = (status) => ({
    background: statusColors[status] || colors.input,
    color: status === 'none' ? colors.text : 'white',
    padding: '0.5rem 1rem',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.875rem'
  });

  return (
    <div style={{
      background: colors.surface,
      padding: '1rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: `2px solid ${statusColors[plate.status] || colors.border}`,
      marginBottom: '1rem'
    }}>
      {/* Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem'
      }}>
        <h4 style={{
          margin: 0,
          color: colors.text,
          fontSize: '1rem'
        }}>
          {plate.name}
          {plate.warning && (
            <span style={{
              marginLeft: '0.5rem',
              fontSize: '0.75rem',
              color: '#ed8936',
              fontWeight: 'normal'
            }}>
              {plate.warning}
            </span>
          )}
        </h4>

        <select
          value={plate.status}
          onChange={handleStatusChange}
          style={getStatusStyle(plate.status)}
        >
          <option value="none">{statusLabels.none}</option>
          <option value="printing">{statusLabels.printing}</option>
          <option value="done">{statusLabels.done}</option>
          <option value="failed">{statusLabels.failed}</option>
        </select>
      </div>

      {/* 3D Preview (bin plates only) */}
      {plate.type === 'bins' && plate.items.length > 0 && (
        <PlatePreview3D plate={plate} failedBinIds={failedBinIds} />
      )}

      {/* Dimensions */}
      <div style={{
        fontSize: '0.875rem',
        color: colors.textSecondary,
        marginBottom: '0.75rem'
      }}>
        {plate.type === 'baseplate' && plate.items.length > 0 ? (
          <span>{plate.items[0].label}</span>
        ) : (
          <span>
            Plate size: {plate.width}×{plate.depth}mm
            {plate.items.length > 0 && ` • Contains ${plate.items.length} bin${plate.items.length === 1 ? '' : 's'}`}
          </span>
        )}
      </div>

      {/* Bins List (for bin plates) */}
      {plate.type === 'bins' && plate.items.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <button
            onClick={() => setShowItems(!showItems)}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.primary,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              padding: 0,
              marginBottom: '0.5rem'
            }}
          >
            {showItems ? '▼' : '▶'} {showItems ? 'Hide' : 'Show'} bins on this plate
          </button>

          {showItems && (
            <div style={{
              paddingLeft: '1rem',
              fontSize: '0.875rem',
              color: colors.text
            }}>
              {plate.items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '0.25rem' }}>
                  • {item.binData.type === 'hollow' ? 'Hollow' : 'Solid'} bin{' '}
                  {item.binData.width}×{item.binData.depth}×{item.binData.height}
                  {item.label && item.label !== `${item.binData.type} bin` && (
                    <span style={{ color: colors.textSecondary }}> ({item.label})</span>
                  )}
                  {item.rotation === 90 && (
                    <span style={{ color: colors.warning, fontSize: '0.75rem' }}> ↻ rotated</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Failure Panel */}
      {plate.status === 'failed' && onMarkBinFailed && (
        <PlateFailurePanel
          plate={plate}
          failedBinIds={failedBinIds}
          onToggleBin={(itemIndex, isFailed) => onMarkBinFailed(plate.id, itemIndex, isFailed)}
          onRepack={onRepackFailed ? () => onRepackFailed(plate.id) : null}
        />
      )}

      {/* Action Button */}
      <button
        onClick={() => onExport(plate.id)}
        style={{
          width: '100%',
          padding: '0.625rem',
          background: colors.success,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '0.875rem'
        }}
      >
        📥 Export STL
      </button>
    </div>
  );
}

export default PlateCard;
