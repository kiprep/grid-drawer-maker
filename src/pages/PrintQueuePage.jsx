import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { generateBaseplates } from '../utils/baseplateGenerator';
import { packBins, repackFailedBins } from '../utils/binPacker';
import { loadPrintQueue, savePrintQueue, calculateProgress, preservePlateStatuses } from '../utils/printQueueHelpers';
import PlateCard from '../components/PlateCard';

const GRIDFINITY_UNIT = 42; // mm
const HEIGHT_UNIT = 7; // mm
const API_BASE = 'http://localhost:8000';

/**
 * Build a flat list of printable objects from the project.
 * Each object gets: id, name, description, type ('baseplate' | 'hollow' | 'solid'), dims, status
 */
function buildPrintItems(project) {
  const items = [];

  // Baseplates
  const baseplates = generateBaseplates(project);
  baseplates.forEach((bp) => {
    const bpData = bp.items[0].binData;
    items.push({
      id: bp.id,
      name: bp.name,
      type: 'baseplate',
      description: `${bpData.gridWidth}x${bpData.gridDepth} units (${bp.width}x${bp.depth}mm)${bpData.hasMagnets ? ' - with magnets' : ''}`,
      widthMm: bp.width,
      depthMm: bp.depth,
      heightMm: null,
      status: 'pending',
      sourceData: bpData
    });
  });

  // Bins
  const bins = project.bins || [];
  bins.forEach(bin => {
    const wMm = bin.width * GRIDFINITY_UNIT;
    const dMm = bin.depth * GRIDFINITY_UNIT;
    const hMm = bin.height * HEIGHT_UNIT;
    items.push({
      id: bin.id,
      name: bin.label || `${bin.type === 'hollow' ? 'Hollow' : 'Solid'} Bin`,
      type: bin.type,
      description: `${bin.width}x${bin.depth}x${bin.height}u (${wMm}x${dMm}x${hMm}mm)`,
      widthMm: wMm,
      depthMm: dMm,
      heightMm: hMm,
      status: 'pending',
      sourceData: bin
    });
  });

  return items;
}

/**
 * Build plates from project bins and baseplates using the bin packer.
 */
function buildPlates(project) {
  const baseplates = generateBaseplates(project);
  const binPlates = packBins(
    project.bins || [],
    project.printerBedWidth,
    project.printerBedDepth
  );
  return [...baseplates, ...binPlates];
}

function PrintQueuePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [project, setProject] = useState(null);
  const [printItems, setPrintItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [generatingIds, setGeneratingIds] = useState(new Set());

  // View mode: 'items' or 'plates'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem(`print-queue-viewmode-${projectId}`) || 'items';
  });

  // Plates view state
  const [plates, setPlates] = useState([]);
  const [generatingPlateIds, setGeneratingPlateIds] = useState(new Set());

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(`print-queue-viewmode-${projectId}`, viewMode);
  }, [viewMode, projectId]);

  // Load project and build item list
  useEffect(() => {
    const savedProjects = localStorage.getItem('gridfinity-projects');
    if (!savedProjects) { navigate('/projects'); return; }

    const projects = JSON.parse(savedProjects);
    const currentProject = projects.find(p => p.id === projectId);
    if (!currentProject) { navigate('/projects'); return; }

    setProject(currentProject);

    // --- Per-item view setup ---
    const savedChecklist = localStorage.getItem(`print-checklist-${projectId}`);
    const items = buildPrintItems(currentProject);

    if (savedChecklist) {
      const saved = JSON.parse(savedChecklist);
      items.forEach(item => {
        const match = saved.find(s => s.id === item.id);
        if (match) item.status = match.status;
      });
    }

    setPrintItems(items);

    // --- Plates view setup ---
    const newPlates = buildPlates(currentProject);
    const savedQueue = loadPrintQueue(projectId);
    if (savedQueue && savedQueue.plates) {
      setPlates(preservePlateStatuses(savedQueue.plates, newPlates));
    } else {
      setPlates(newPlates);
    }
  }, [projectId, navigate]);

  // Persist per-item statuses
  useEffect(() => {
    if (printItems.length > 0) {
      const toSave = printItems.map(({ id, status }) => ({ id, status }));
      localStorage.setItem(`print-checklist-${projectId}`, JSON.stringify(toSave));
    }
  }, [printItems, projectId]);

  // Persist plate statuses
  useEffect(() => {
    if (plates.length > 0) {
      savePrintQueue(projectId, { plates });
    }
  }, [plates, projectId]);

  // --- Per-item handlers ---
  const updateStatus = (itemId, newStatus) => {
    setPrintItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    ));
  };

  const toggleSelected = (itemId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectAllPending = () => {
    const pendingIds = printItems.filter(i => i.status === 'pending').map(i => i.id);
    setSelectedIds(new Set(pendingIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const generateAndDownload = async (item) => {
    setGeneratingIds(prev => new Set(prev).add(item.id));
    try {
      const src = item.sourceData;
      let endpoint, body;

      if (item.type === 'baseplate') {
        endpoint = `${API_BASE}/api/baseplate/stl`;
        body = {
          gridWidth: src.gridWidth,
          gridDepth: src.gridDepth,
          hasMagnets: src.hasMagnets || false
        };
      } else {
        endpoint = `${API_BASE}/api/bin/stl`;
        body = {
          width: src.width,
          depth: src.depth,
          height: src.height,
          type: src.type || 'hollow',
          wallThickness: src.wallThickness || 1.2,
          dividers: src.dividers || { horizontal: 0, vertical: 0 },
          magnets: src.magnets || false,
          stackable: src.stackable || false,
          fingerGrabs: src.fingerGrabs || false,
          label: src.label || null
        };
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || `Server error ${resp.status}`);
      }

      const disposition = resp.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : item.type === 'baseplate'
          ? `baseplate-${src.gridWidth}x${src.gridDepth}.stl`
          : `bin-${src.width}x${src.depth}x${src.height}-${src.type || 'hollow'}.stl`;

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Failed to generate STL for ${item.name}:\n${err.message}`);
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleDownloadSTL = (item) => {
    generateAndDownload(item);
  };

  const handleDownloadSelected = () => {
    const selected = printItems.filter(i => selectedIds.has(i.id));
    if (selected.length === 0) return;
    selected.reduce(
      (chain, item) => chain.then(() => generateAndDownload(item)),
      Promise.resolve()
    );
  };

  const markSelectedPrinting = () => {
    setPrintItems(prev => prev.map(item =>
      selectedIds.has(item.id) ? { ...item, status: 'printing' } : item
    ));
    setSelectedIds(new Set());
  };

  // --- Plates view handlers ---
  const handlePlateStatusChange = (plateId, newStatus) => {
    setPlates(prev => prev.map(plate =>
      plate.id === plateId ? { ...plate, status: newStatus } : plate
    ));
  };

  const handleMarkBinFailed = (plateId, itemIndex, isFailed) => {
    setPlates(prev => prev.map(plate => {
      if (plate.id !== plateId) return plate;
      const updatedItems = plate.items.map((item, idx) =>
        idx === itemIndex ? { ...item, status: isFailed ? 'failed' : 'pending' } : item
      );
      return { ...plate, items: updatedItems };
    }));
  };

  const handleRepackFailed = (plateId) => {
    const plate = plates.find(p => p.id === plateId);
    if (!plate || !project) return;

    const failedItems = plate.items.filter(item => item.status === 'failed');
    if (failedItems.length === 0) return;

    const reprintPlates = repackFailedBins(
      failedItems,
      project.printerBedWidth,
      project.printerBedDepth
    );

    // Remove failed items from original plate, add reprint plates
    setPlates(prev => {
      const updated = prev.map(p => {
        if (p.id !== plateId) return p;
        const remaining = p.items.filter(item => item.status !== 'failed');
        if (remaining.length === 0) {
          return { ...p, status: 'done', items: [] };
        }
        return { ...p, items: remaining };
      });
      return [...updated, ...reprintPlates];
    });
  };

  const handleExport3MF = async (plateId) => {
    const plate = plates.find(p => p.id === plateId);
    if (!plate || !project) return;

    setGeneratingPlateIds(prev => new Set(prev).add(plateId));
    try {
      const body = {
        name: plate.name,
        bedWidthMm: project.printerBedWidth,
        bedDepthMm: project.printerBedDepth,
        items: plate.items.map(item => ({
          itemType: plate.type === 'baseplate' ? 'baseplate' : 'bin',
          binData: item.binData,
          // Convert corner-origin (packer) to center-origin (3MF mesh placement)
          xMm: item.x + item.width / 2,
          yMm: item.y + item.depth / 2,
          rotation: item.rotation || 0
        }))
      };

      const resp = await fetch(`${API_BASE}/api/plate/3mf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || `Server error ${resp.status}`);
      }

      const disposition = resp.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `${plate.name.replace(/\s+/g, '_')}.3mf`;

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Failed to export 3MF for ${plate.name}:\n${err.message}`);
    } finally {
      setGeneratingPlateIds(prev => {
        const next = new Set(prev);
        next.delete(plateId);
        return next;
      });
    }
  };

  if (!project) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.text
      }}>
        Loading...
      </div>
    );
  }

  // Progress calculation depends on active view
  let completed, total, percentage;
  if (viewMode === 'items') {
    completed = printItems.filter(i => i.status === 'done').length;
    total = printItems.length;
    percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  } else {
    const progress = calculateProgress(plates);
    completed = progress.completed;
    total = progress.total;
    percentage = progress.percentage;
  }

  const baseplateItems = printItems.filter(i => i.type === 'baseplate');
  const hollowBins = printItems.filter(i => i.type === 'hollow');
  const solidBins = printItems.filter(i => i.type === 'solid');

  const statusColors = {
    pending: colors.input,
    printing: colors.warning,
    done: colors.success
  };

  const statusLabels = {
    pending: 'Not Started',
    printing: 'Printing',
    done: 'Done'
  };

  const renderItem = (item) => {
    const isSelected = selectedIds.has(item.id);
    const isGenerating = generatingIds.has(item.id);
    return (
      <div
        key={item.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: isSelected ? `${colors.primary}15` : colors.surface,
          border: `2px solid ${isSelected ? colors.primary : statusColors[item.status] || colors.border}`,
          borderRadius: '8px',
          marginBottom: '0.5rem',
          transition: 'border-color 0.2s'
        }}
      >
        {/* Checkbox for selection */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelected(item.id)}
          style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
        />

        {/* Item info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 'bold', color: colors.text, fontSize: '0.95rem' }}>
            {item.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: colors.textSecondary }}>
            {item.description}
          </div>
        </div>

        {/* Status selector */}
        <select
          value={item.status}
          onChange={(e) => updateStatus(item.id, e.target.value)}
          style={{
            background: statusColors[item.status],
            color: item.status === 'pending' ? colors.text : 'white',
            padding: '0.4rem 0.6rem',
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            flexShrink: 0
          }}
        >
          <option value="pending">{statusLabels.pending}</option>
          <option value="printing">{statusLabels.printing}</option>
          <option value="done">{statusLabels.done}</option>
        </select>

        {/* Download button */}
        <button
          onClick={() => handleDownloadSTL(item)}
          disabled={isGenerating}
          style={{
            padding: '0.4rem 0.75rem',
            background: isGenerating ? colors.textSecondary : colors.success,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isGenerating ? 'wait' : 'pointer',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            minWidth: '80px',
            textAlign: 'center'
          }}
        >
          {isGenerating ? 'Generating...' : 'Get STL'}
        </button>
      </div>
    );
  };

  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          color: colors.text,
          marginBottom: '0.75rem',
          fontSize: '1.15rem'
        }}>
          {title} ({items.length})
        </h2>
        {items.map(renderItem)}
      </div>
    );
  };

  const progressLabel = viewMode === 'items'
    ? `${completed} of ${total} objects printed`
    : `${completed} of ${total} plates done`;

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => navigate('/projects')}
            style={{
              padding: '0.75rem 1.5rem',
              background: colors.surface,
              border: `2px solid ${colors.primary}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: colors.primary,
              marginRight: '1rem'
            }}
          >
            &larr; Back to Projects
          </button>
          <h1 style={{ margin: 0, color: colors.text }}>
            Print Checklist: {project.name}
          </h1>
        </div>

        {/* Progress */}
        <div style={{
          background: colors.surface,
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem'
          }}>
            <h2 style={{ margin: 0, color: colors.text, fontSize: '1.15rem' }}>Progress</h2>
            <span style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: percentage === 100 ? colors.success : colors.primary
            }}>
              {percentage}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '24px',
            background: colors.input,
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${percentage}%`,
              height: '100%',
              background: percentage === 100 ? colors.success : colors.primary,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{
            marginTop: '0.5rem',
            marginBottom: 0,
            color: colors.textSecondary,
            fontSize: '0.85rem'
          }}>
            {progressLabel}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('items')}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: viewMode === 'items' ? colors.primary : colors.surface,
                color: viewMode === 'items' ? 'white' : colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Per Item
            </button>
            <button
              onClick={() => setViewMode('plates')}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: viewMode === 'plates' ? colors.primary : colors.surface,
                color: viewMode === 'plates' ? 'white' : colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Build Plates
            </button>
          </div>
        </div>

        {/* === Per Item View === */}
        {viewMode === 'items' && (
          <>
            {/* Batch actions */}
            {total > 0 && (
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={selectAllPending}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    color: colors.primary,
                    border: `2px solid ${colors.primary}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}
                >
                  Select All Pending
                </button>
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={clearSelection}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        color: colors.textSecondary,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={handleDownloadSelected}
                      style={{
                        padding: '0.5rem 1rem',
                        background: colors.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}
                    >
                      Get {selectedIds.size} STL{selectedIds.size === 1 ? '' : 's'}
                    </button>
                    <button
                      onClick={markSelectedPrinting}
                      style={{
                        padding: '0.5rem 1rem',
                        background: colors.warning,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}
                    >
                      Mark {selectedIds.size} as Printing
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Empty State */}
            {printItems.length === 0 && (
              <div style={{
                background: colors.surface,
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <p style={{ color: colors.textSecondary, marginBottom: '1rem' }}>
                  No objects to print yet. Add bins to your project first.
                </p>
                <button
                  onClick={() => navigate(`/project/${projectId}/placer`)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Go to Editor
                </button>
              </div>
            )}

            {/* Object Lists */}
            {renderSection('Baseplates', baseplateItems)}
            {renderSection('Hollow Bins', hollowBins)}
            {renderSection('Solid Bins', solidBins)}
          </>
        )}

        {/* === Build Plates View === */}
        {viewMode === 'plates' && (
          <>
            {plates.length === 0 ? (
              <div style={{
                background: colors.surface,
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <p style={{ color: colors.textSecondary, marginBottom: '1rem' }}>
                  No plates to build. Add bins to your project first.
                </p>
                <button
                  onClick={() => navigate(`/project/${projectId}/placer`)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Go to Editor
                </button>
              </div>
            ) : (
              plates.map(plate => (
                <PlateCard
                  key={plate.id}
                  plate={plate}
                  onStatusChange={handlePlateStatusChange}
                  onExport={handleExport3MF}
                  onMarkBinFailed={handleMarkBinFailed}
                  onRepackFailed={handleRepackFailed}
                  exportLabel="Export 3MF"
                  isExporting={generatingPlateIds.has(plate.id)}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PrintQueuePage;
