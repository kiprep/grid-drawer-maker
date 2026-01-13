import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import BinPreview from './BinPreview';

function BinEditor({ bin, onSaveBin, maxHeight, onClose }) {
  const { colors } = useTheme();
  const [binType, setBinType] = useState(bin.type);
  const [binConfig, setBinConfig] = useState({
    width: bin.width,
    depth: bin.depth,
    height: bin.height,
    label: bin.label || '',
    color: bin.color || null,
    wallThickness: bin.wallThickness || 1.2,
    stackable: bin.stackable || false,
    magnets: bin.magnets || false,
    lid: bin.lid || false,
    dividers: bin.dividers || { horizontal: 0, vertical: 0 },
    fingerGrabs: bin.fingerGrabs || false,
    cutout: bin.cutout || null
  });

  // Collapsible section states
  const [showWallThickness, setShowWallThickness] = useState(false);
  const [showDividers, setShowDividers] = useState(false);
  const [showMiscOptions, setShowMiscOptions] = useState(false);

  const [availableCutouts, setAvailableCutouts] = useState([]);

  useEffect(() => {
    setAvailableCutouts([
      { name: 'scissors', file: 'scissors.png' },
      { name: 'tea-steeper', file: 'tea-steeper.png' }
    ]);
  }, []);

  const updateConfig = (key, value) => {
    setBinConfig({ ...binConfig, [key]: value });
  };

  const updateDividers = (direction, value) => {
    setBinConfig({
      ...binConfig,
      dividers: {
        ...binConfig.dividers,
        [direction]: value
      }
    });
  };

  const handleSave = () => {
    const updatedBin = {
      ...bin,
      type: binType,
      ...binConfig
    };
    onSaveBin(updatedBin);
    onClose();
  };

  const maxHeightUnits = Math.floor(maxHeight / 7);

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: '4px',
    background: colors.input,
    color: colors.text,
    fontSize: '0.875rem',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    color: colors.textSecondary,
    display: 'block',
    marginBottom: '0.25rem'
  };

  const checkboxLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    marginBottom: '0.5rem',
    color: colors.text
  };

  const collapsibleHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem',
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: '0.5rem',
    userSelect: 'none'
  };

  return (
    <div style={{ color: colors.text, padding: '0.5rem 0' }}>
      {/* Live Preview */}
      <div style={{ marginBottom: '1rem' }}>
        <BinPreview binConfig={{ ...binConfig, type: binType }} />
      </div>

      {/* Bin Type Selector */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: colors.text }}>
          Bin Type
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setBinType('hollow')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: binType === 'hollow' ? colors.primary : colors.surface,
              color: binType === 'hollow' ? 'white' : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Hollow
          </button>
          <button
            onClick={() => setBinType('solid')}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: binType === 'solid' ? colors.primary : colors.surface,
              color: binType === 'solid' ? 'white' : colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Solid
          </button>
        </div>
      </div>

      {/* Dimensions */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: colors.text }}>
          Dimensions (Gridfinity Units)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
          <div>
            <label style={labelStyle}>Width</label>
            <input
              type="number"
              min="1"
              max="10"
              value={binConfig.width}
              onChange={(e) => updateConfig('width', Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Depth</label>
            <input
              type="number"
              min="1"
              max="10"
              value={binConfig.depth}
              onChange={(e) => updateConfig('depth', Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              Height (max {maxHeightUnits})
            </label>
            <input
              type="number"
              min="1"
              max={maxHeightUnits}
              value={binConfig.height}
              onChange={(e) => updateConfig('height', Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              style={inputStyle}
            />
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
          Physical: {binConfig.width * 42}mm × {binConfig.depth * 42}mm × {binConfig.height * 7}mm
        </p>
      </div>

      {/* Label */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: colors.text }}>
          Label (optional)
        </label>
        <input
          type="text"
          placeholder="e.g., Screws, 🔧 Tools, 📦 Parts"
          value={binConfig.label}
          onChange={(e) => updateConfig('label', e.target.value)}
          style={inputStyle}
          maxLength={20}
        />
        <p style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
          Emojis allowed! Displayed if bin is large enough.
        </p>
      </div>

      {/* Color Picker */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: colors.text }}>
          Bin Color (optional)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="color"
            value={binConfig.color || (binType === 'hollow' ? '#48bb78' : '#f59e0b')}
            onChange={(e) => updateConfig('color', e.target.value)}
            style={{
              width: '60px',
              height: '40px',
              border: `2px solid ${colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              background: 'transparent'
            }}
          />
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={binConfig.color || ''}
              onChange={(e) => updateConfig('color', e.target.value || null)}
              placeholder={binType === 'hollow' ? '#48bb78 (default green)' : '#f59e0b (default orange)'}
              style={inputStyle}
              maxLength={7}
            />
          </div>
          {binConfig.color && (
            <button
              onClick={() => updateConfig('color', null)}
              style={{
                padding: '0.5rem',
                background: colors.input,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap'
              }}
              title="Reset to default color"
            >
              Reset
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
          Choose a custom color or leave blank for default (green for hollow, orange for solid).
        </p>
      </div>

      {/* Hollow Bin Options */}
      {binType === 'hollow' && (
        <>
          {/* Wall Thickness - Collapsible */}
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={collapsibleHeaderStyle}
              onClick={() => setShowWallThickness(!showWallThickness)}
            >
              <span>Wall Thickness</span>
              <span>{showWallThickness ? '▼' : '▶'}</span>
            </div>
            {showWallThickness && (
              <div style={{ paddingLeft: '0.5rem' }}>
                <label style={labelStyle}>Wall Thickness (mm)</label>
                <input
                  type="number"
                  min="0.8"
                  max="3"
                  step="0.1"
                  value={binConfig.wallThickness}
                  onChange={(e) => updateConfig('wallThickness', Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {/* Dividers - Collapsible */}
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={collapsibleHeaderStyle}
              onClick={() => setShowDividers(!showDividers)}
            >
              <span>Dividers</span>
              <span>{showDividers ? '▼' : '▶'}</span>
            </div>
            {showDividers && (
              <div style={{ paddingLeft: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={labelStyle}>Horizontal</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={binConfig.dividers.horizontal}
                      onChange={(e) => updateDividers('horizontal', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Vertical</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={binConfig.dividers.vertical}
                      onChange={(e) => updateDividers('vertical', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Misc Options - Collapsible */}
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={collapsibleHeaderStyle}
              onClick={() => setShowMiscOptions(!showMiscOptions)}
            >
              <span>Misc Options</span>
              <span>{showMiscOptions ? '▼' : '▶'}</span>
            </div>
            {showMiscOptions && (
              <div style={{ paddingLeft: '0.5rem' }}>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={binConfig.stackable}
                    onChange={(e) => updateConfig('stackable', e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ color: colors.text }}>Stackable</span>
                </label>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={binConfig.magnets}
                    onChange={(e) => updateConfig('magnets', e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ color: colors.text }}>Magnets</span>
                </label>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={binConfig.lid}
                    onChange={(e) => updateConfig('lid', e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ color: colors.text }}>Lid</span>
                </label>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={binConfig.fingerGrabs}
                    onChange={(e) => updateConfig('fingerGrabs', e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ color: colors.text }}>Finger Grabs</span>
                </label>
              </div>
            )}
          </div>
        </>
      )}

      {/* Solid Bin Options */}
      {binType === 'solid' && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: colors.text }}>
            Tool Cutout
          </label>
          <select
            value={binConfig.cutout || ''}
            onChange={(e) => updateConfig('cutout', e.target.value)}
            style={inputStyle}
          >
            <option value="">Select a cutout</option>
            {availableCutouts.map(cutout => (
              <option key={cutout.file} value={cutout.file}>
                {cutout.name}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.75rem', color: colors.textSecondary, marginTop: '0.25rem' }}>
            Add PNG files to public/cutouts/ to see more options
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: colors.success,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          Save Changes
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: colors.input,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default BinEditor;
