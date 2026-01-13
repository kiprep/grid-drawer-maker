import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function ChecklistPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [project, setProject] = useState(null);
  const [checklist, setChecklist] = useState({
    baseplates: [],
    hollowBins: [],
    solidBins: [],
    spacers: []
  });

  useEffect(() => {
    const savedProjects = localStorage.getItem('gridfinity-projects');
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      const currentProject = projects.find(p => p.id === projectId);
      if (currentProject) {
        setProject(currentProject);

        // Load saved checklist if exists
        const savedChecklist = localStorage.getItem(`checklist-${projectId}`);
        if (savedChecklist) {
          setChecklist(JSON.parse(savedChecklist));
        } else {
          // Generate initial checklist
          generateChecklist(currentProject);
        }
      } else {
        navigate('/projects');
      }
    } else {
      navigate('/projects');
    }
  }, [projectId, navigate]);

  const generateChecklist = (proj) => {
    const newChecklist = {
      baseplates: [
        { id: 'bp-1', name: 'Main Baseplate', printed: false }
      ],
      hollowBins: proj.bins
        ? proj.bins
            .filter(b => b.type === 'hollow')
            .map((b, idx) => ({
              id: `hollow-${idx}`,
              name: `Hollow Bin ${idx + 1} (${b.width}x${b.depth}x${b.height})`,
              printed: false
            }))
        : [],
      solidBins: proj.bins
        ? proj.bins
            .filter(b => b.type === 'solid')
            .map((b, idx) => ({
              id: `solid-${idx}`,
              name: `Solid Bin ${idx + 1} (${b.width}x${b.depth}x${b.height})`,
              cutout: b.cutout || 'unknown',
              printed: false
            }))
        : [],
      spacers: []
    };
    setChecklist(newChecklist);
  };

  const saveChecklist = (updatedChecklist) => {
    localStorage.setItem(`checklist-${projectId}`, JSON.stringify(updatedChecklist));
    setChecklist(updatedChecklist);
  };

  const toggleItem = (category, itemId) => {
    const updatedChecklist = {
      ...checklist,
      [category]: checklist[category].map(item =>
        item.id === itemId ? { ...item, printed: !item.printed } : item
      )
    };
    saveChecklist(updatedChecklist);
  };

  const getProgress = () => {
    const allItems = [
      ...checklist.baseplates,
      ...checklist.hollowBins,
      ...checklist.solidBins,
      ...checklist.spacers
    ];
    const total = allItems.length;
    const completed = allItems.filter(item => item.printed).length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  if (!project) {
    return <div>Loading...</div>;
  }

  const progress = getProgress();

  const renderCategory = (title, items, category) => {
    if (items.length === 0) return null;

    return (
      <div style={{
        background: colors.surface,
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '1rem'
      }}>
        <h3 style={{ marginBottom: '1rem' }}>{title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map(item => (
            <label
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem',
                background: item.printed ? '#f0fdf4' : '#f9fafb',
                border: `2px solid ${item.printed ? '#48bb78' : '#e5e7eb'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <input
                type="checkbox"
                checked={item.printed}
                onChange={() => toggleItem(category, item.id)}
                style={{
                  width: '20px',
                  height: '20px',
                  marginRight: '1rem',
                  cursor: 'pointer'
                }}
              />
              <span style={{
                flex: 1,
                textDecoration: item.printed ? 'line-through' : 'none',
                color: item.printed ? '#666' : '#333'
              }}>
                {item.name}
              </span>
              {item.cutout && (
                <span style={{
                  fontSize: '0.875rem',
                  color: '#667eea',
                  background: '#e0e7ff',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px'
                }}>
                  {item.cutout}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>
    );
  };

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
          <h1 style={{ margin: 0, color: colors.text }}>Print Checklist: {project.name}</h1>
        </div>

        {/* Progress Bar */}
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
              color: progress.percentage === 100 ? '#48bb78' : '#667eea'
            }}>
              {progress.percentage}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '30px',
            background: '#e5e7eb',
            borderRadius: '15px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress.percentage}%`,
              height: '100%',
              background: progress.percentage === 100 ? '#48bb78' : '#667eea',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{
            marginTop: '1rem',
            color: colors.textSecondary,
            fontSize: '0.875rem'
          }}>
            {progress.completed} of {progress.total} items printed
          </p>
        </div>

        {/* Checklist Categories */}
        {renderCategory('Baseplates', checklist.baseplates, 'baseplates')}
        {renderCategory('Hollow Bins', checklist.hollowBins, 'hollowBins')}
        {renderCategory('Solid Bins (Tool Cutouts)', checklist.solidBins, 'solidBins')}
        {renderCategory('Spacers', checklist.spacers, 'spacers')}

        {progress.total === 0 && (
          <div style={{
            background: colors.surface,
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <p style={{ color: colors.textSecondary }}>
              No items to print yet. Add bins to your project to generate a checklist.
            </p>
            <button
              onClick={() => navigate(`/project/${projectId}/placer`)}
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1.5rem',
                background: '#667eea',
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
      </div>
    </div>
  );
}

export default ChecklistPage;
