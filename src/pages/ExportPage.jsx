import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function ExportPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [project, setProject] = useState(null);
  const [exportStatus, setExportStatus] = useState('ready'); // ready, generating, complete

  useEffect(() => {
    const savedProjects = localStorage.getItem('gridfinity-projects');
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      const currentProject = projects.find(p => p.id === projectId);
      if (currentProject) {
        setProject(currentProject);
      } else {
        navigate('/projects');
      }
    } else {
      navigate('/projects');
    }
  }, [projectId, navigate]);

  const handleExport = () => {
    setExportStatus('generating');

    // TODO: Implement STL generation and ZIP creation
    setTimeout(() => {
      setExportStatus('complete');
      alert('Export functionality coming soon! This will generate STL files for baseplates, bins, and spacers.');
    }, 1000);
  };

  if (!project) {
    return <div>Loading...</div>;
  }

  const binCounts = {
    hollow: project.bins ? project.bins.filter(b => b.type === 'hollow').length : 0,
    solid: project.bins ? project.bins.filter(b => b.type === 'solid').length : 0,
    total: project.bins ? project.bins.length : 0
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
            onClick={() => navigate(`/project/${projectId}/placer`)}
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
            ← Back to Editor
          </button>
          <h1 style={{ margin: 0, color: colors.text }}>Export Project: {project.name}</h1>
        </div>

        {/* Project Summary */}
        <div style={{
          background: colors.surface,
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          border: `1px solid ${colors.border}`
        }}>
          <h2 style={{ color: colors.text }}>Project Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <strong>Drawer Dimensions:</strong>
              <p>{project.drawerWidth} x {project.drawerDepth} x {project.drawerHeight}mm</p>
            </div>
            <div>
              <strong>Printer Bed:</strong>
              <p>{project.printerBedWidth} x {project.printerBedDepth}mm</p>
            </div>
            <div>
              <strong>Total Bins:</strong>
              <p>{binCounts.total}</p>
            </div>
            <div>
              <strong>Bin Types:</strong>
              <p>{binCounts.hollow} hollow, {binCounts.solid} solid</p>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div style={{
          background: colors.surface,
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2>Export Files</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            This will generate a ZIP file containing:
          </p>
          <ul style={{ color: '#666', lineHeight: '1.8' }}>
            <li><strong>Baseplates/</strong> - Gridfinity baseplates optimized for your printer bed</li>
            <li><strong>Hollow-Bins/</strong> - Stackable bins with dividers and lids</li>
            <li><strong>Solid-Bins/</strong> - Tool cutout bins with custom imprints</li>
            <li><strong>Spacers/</strong> - Fill pieces for gaps in your layout</li>
          </ul>

          <button
            onClick={handleExport}
            disabled={exportStatus === 'generating' || binCounts.total === 0}
            style={{
              width: '100%',
              padding: '1rem',
              background: binCounts.total === 0 ? '#ccc' : '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: binCounts.total === 0 ? 'not-allowed' : 'pointer',
              fontSize: '1.125rem',
              fontWeight: 'bold',
              marginTop: '1rem'
            }}
          >
            {exportStatus === 'generating' ? 'Generating...' : 'Download STL Files (ZIP)'}
          </button>

          {binCounts.total === 0 && (
            <p style={{ color: '#ed8936', marginTop: '1rem', fontSize: '0.875rem' }}>
              No bins to export. Please add bins to your project first.
            </p>
          )}
        </div>

        {/* File Format Info */}
        <div style={{
          background: colors.surface,
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>About STL Files</h2>
          <p style={{ color: '#666', lineHeight: '1.6' }}>
            All files are exported as STL format, compatible with most 3D printing slicers.
            Files are organized by type and optimized to fit your printer bed dimensions.
            Baseplates include {project.baseplateWithMagnets ? 'magnet holes' : 'no magnet holes'} as specified in your project settings.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExportPage;
