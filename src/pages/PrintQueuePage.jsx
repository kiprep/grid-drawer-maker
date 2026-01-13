import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import PlateCard from '../components/PlateCard';
import { generateBaseplates } from '../utils/baseplateGenerator';
import { packBins } from '../utils/binPacker';
import {
  generateBinsHash,
  loadPrintQueue,
  savePrintQueue,
  calculateProgress,
  shouldRegeneratePlates,
  preservePlateStatuses
} from '../utils/printQueueHelpers';

function PrintQueuePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [project, setProject] = useState(null);
  const [plates, setPlates] = useState([]);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);

  // Load project and generate/load plates
  useEffect(() => {
    const savedProjects = localStorage.getItem('gridfinity-projects');
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      const currentProject = projects.find(p => p.id === projectId);

      if (currentProject) {
        setProject(currentProject);
        loadOrGeneratePlates(currentProject);
      } else {
        navigate('/projects');
      }
    } else {
      navigate('/projects');
    }
  }, [projectId, navigate]);

  const loadOrGeneratePlates = (proj) => {
    const storedQueue = loadPrintQueue(projectId);
    const currentBins = proj.bins || [];

    if (shouldRegeneratePlates(storedQueue, currentBins)) {
      // Need to regenerate
      if (storedQueue) {
        // Queue exists but bins changed - show prompt
        setNeedsRegeneration(true);
        // Load old plates temporarily to preserve statuses
        setPlates(storedQueue.plates || []);
      } else {
        // No queue exists - generate fresh
        generatePlates(proj);
      }
    } else {
      // Load existing queue
      setPlates(storedQueue.plates || []);
      setNeedsRegeneration(false);
    }
  };

  const generatePlates = (proj) => {
    const currentBins = proj.bins || [];

    // Generate baseplates
    const baseplates = generateBaseplates(proj);

    // Pack bins
    const binPlates = packBins(
      currentBins,
      proj.printerBedWidth,
      proj.printerBedDepth
    );

    // Combine all plates
    const allPlates = [...baseplates, ...binPlates];

    // Try to preserve statuses from old plates
    const storedQueue = loadPrintQueue(projectId);
    const finalPlates = storedQueue
      ? preservePlateStatuses(storedQueue.plates, allPlates)
      : allPlates;

    // Save to state and localStorage
    setPlates(finalPlates);
    savePrintQueue(projectId, {
      projectId,
      generatedAt: Date.now(),
      projectBinsHash: generateBinsHash(currentBins),
      plates: finalPlates
    });
    setNeedsRegeneration(false);
  };

  const handleRegeneratePlates = () => {
    if (project) {
      generatePlates(project);
    }
  };

  const handleStatusChange = (plateId, newStatus) => {
    const updatedPlates = plates.map(plate =>
      plate.id === plateId ? { ...plate, status: newStatus } : plate
    );

    setPlates(updatedPlates);

    // Update localStorage
    const storedQueue = loadPrintQueue(projectId);
    if (storedQueue) {
      storedQueue.plates = updatedPlates;
      savePrintQueue(projectId, storedQueue);
    }
  };

  const handleExportPlate = (plateId) => {
    const plate = plates.find(p => p.id === plateId);
    if (!plate) return;

    // TODO: Implement actual STL generation
    // For now, show a placeholder message
    alert(`Export functionality coming soon!\n\nPlate: ${plate.name}\nType: ${plate.type}\nDimensions: ${plate.width}×${plate.depth}mm\n\nThis will generate an STL file for this plate.`);
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

  const progress = calculateProgress(plates);
  const baseplates = plates.filter(p => p.type === 'baseplate');
  const binPlates = plates.filter(p => p.type === 'bins');

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
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
            ← Back to Projects
          </button>
          <h1 style={{ margin: 0, color: colors.text }}>
            Print Queue: {project.name}
          </h1>
        </div>

        {/* Progress Section */}
        <div style={{
          background: colors.surface,
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h2 style={{ margin: 0, color: colors.text }}>Overall Progress</h2>
            <span style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: progress.percentage === 100 ? colors.success : colors.primary
            }}>
              {progress.percentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '30px',
            background: colors.input,
            borderRadius: '15px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress.percentage}%`,
              height: '100%',
              background: progress.percentage === 100 ? colors.success : colors.primary,
              transition: 'width 0.3s ease'
            }} />
          </div>

          <p style={{
            marginTop: '1rem',
            marginBottom: '1rem',
            color: colors.textSecondary,
            fontSize: '0.875rem'
          }}>
            {progress.completed} of {progress.total} plates completed
          </p>

          {/* Regeneration Prompt */}
          {needsRegeneration && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#fed7d7',
              border: '2px solid #fc8181',
              borderRadius: '8px',
              color: '#742a2a'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>
                ⚠️ Project bins have changed
              </p>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>
                The bins in this project have been modified. Regenerate plates to update the print queue.
              </p>
              <button
                onClick={handleRegeneratePlates}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#c53030',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ↻ Regenerate Plates
              </button>
            </div>
          )}

          {/* Manual Regeneration */}
          {!needsRegeneration && plates.length > 0 && (
            <button
              onClick={handleRegeneratePlates}
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                color: colors.primary,
                border: `2px solid ${colors.primary}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.875rem'
              }}
            >
              ↻ Regenerate Plates
            </button>
          )}
        </div>

        {/* Empty State */}
        {plates.length === 0 && (
          <div style={{
            background: colors.surface,
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <p style={{ color: colors.textSecondary, marginBottom: '1rem' }}>
              No bins to print yet. Add bins to your project to generate a print queue.
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

        {/* Baseplates Section */}
        {baseplates.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{
              color: colors.text,
              marginBottom: '1rem',
              fontSize: '1.25rem'
            }}>
              Baseplates ({baseplates.length} {baseplates.length === 1 ? 'plate' : 'plates'})
            </h2>
            {baseplates.map(plate => (
              <PlateCard
                key={plate.id}
                plate={plate}
                onStatusChange={handleStatusChange}
                onExport={handleExportPlate}
              />
            ))}
          </div>
        )}

        {/* Bin Plates Section */}
        {binPlates.length > 0 && (
          <div>
            <h2 style={{
              color: colors.text,
              marginBottom: '1rem',
              fontSize: '1.25rem'
            }}>
              Bin Plates ({binPlates.length} {binPlates.length === 1 ? 'plate' : 'plates'})
            </h2>
            {binPlates.map(plate => (
              <PlateCard
                key={plate.id}
                plate={plate}
                onStatusChange={handleStatusChange}
                onExport={handleExportPlate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PrintQueuePage;
