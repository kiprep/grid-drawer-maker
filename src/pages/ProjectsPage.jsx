import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function ProjectsPage() {
  const navigate = useNavigate();
  const { colors, theme, toggleTheme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [newProject, setNewProject] = useState({
    name: '',
    drawerWidth: 300,
    drawerDepth: 200,
    drawerHeight: 100,
    printerBedWidth: 220,
    printerBedDepth: 220,
    baseplateWithMagnets: false
  });

  // Load projects from localStorage
  useEffect(() => {
    const savedProjects = localStorage.getItem('gridfinity-projects');
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    }
  }, []);

  const handleCreateProject = () => {
    const projectId = Date.now().toString();
    const project = {
      id: projectId,
      ...newProject,
      createdAt: new Date().toISOString(),
      bins: []
    };

    const updatedProjects = [...projects, project];
    setProjects(updatedProjects);
    localStorage.setItem('gridfinity-projects', JSON.stringify(updatedProjects));

    setShowNewProjectModal(false);
    navigate(`/project/${projectId}/placer`);
  };

  const openProject = (projectId) => {
    navigate(`/project/${projectId}/placer`);
  };

  const openPrintQueue = (projectId, e) => {
    e.stopPropagation();
    navigate(`/project/${projectId}/print-queue`);
  };

  const handleDeleteProject = (projectId, e) => {
    e.stopPropagation();
    setDeleteConfirmId(projectId);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;

    // Remove project from state and localStorage
    const updatedProjects = projects.filter(p => p.id !== deleteConfirmId);
    setProjects(updatedProjects);
    localStorage.setItem('gridfinity-projects', JSON.stringify(updatedProjects));

    // Also remove loose bins for this project
    localStorage.removeItem(`loose-bins-${deleteConfirmId}`);

    setDeleteConfirmId(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: colors.text }}>My Projects</h1>
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              padding: '0.75rem',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.text
            }}
            title="Settings"
          >
            ⚙
          </button>
        </div>

        <button
          onClick={() => setShowNewProjectModal(true)}
          style={{
            padding: '1rem 2rem',
            fontSize: '1rem',
            background: colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '2rem'
          }}
        >
          + New Drawer Project
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => openProject(project.id)}
              style={{
                background: colors.surface,
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                border: `1px solid ${colors.border}`
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <h3 style={{ color: colors.text }}>{project.name}</h3>
              <p style={{ color: colors.textSecondary }}>Drawer: {project.drawerWidth} x {project.drawerDepth} x {project.drawerHeight}mm</p>
              <p style={{ color: colors.textSecondary }}>Printer: {project.printerBedWidth} x {project.printerBedDepth}mm</p>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); openProject(project.id); }}
                  style={{
                    flex: 1,
                    minWidth: '80px',
                    padding: '0.5rem',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Open
                </button>
                <button
                  onClick={(e) => openPrintQueue(project.id, e)}
                  style={{
                    flex: 1,
                    minWidth: '80px',
                    padding: '0.5rem',
                    background: colors.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Print Queue
                </button>
                <button
                  onClick={(e) => handleDeleteProject(project.id, e)}
                  style={{
                    flex: 1,
                    minWidth: '80px',
                    padding: '0.5rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title="Delete Project"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: colors.surface,
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '90%'
            }}>
              <h2 style={{ color: colors.text }}>New Drawer Project</h2>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: colors.text }}>Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="My Drawer"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: '4px',
                    background: colors.input,
                    color: colors.text
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: colors.text }}>Drawer Dimensions (mm)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    value={newProject.drawerWidth}
                    onChange={(e) => setNewProject({ ...newProject, drawerWidth: Number(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    placeholder="Width"
                    style={{ flex: 1, padding: '0.5rem', border: `1px solid ${colors.inputBorder}`, borderRadius: '4px', background: colors.input, color: colors.text }}
                  />
                  <input
                    type="number"
                    value={newProject.drawerDepth}
                    onChange={(e) => setNewProject({ ...newProject, drawerDepth: Number(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    placeholder="Depth"
                    style={{ flex: 1, padding: '0.5rem', border: `1px solid ${colors.inputBorder}`, borderRadius: '4px', background: colors.input, color: colors.text }}
                  />
                  <input
                    type="number"
                    value={newProject.drawerHeight}
                    onChange={(e) => setNewProject({ ...newProject, drawerHeight: Number(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    placeholder="Height"
                    style={{ flex: 1, padding: '0.5rem', border: `1px solid ${colors.inputBorder}`, borderRadius: '4px', background: colors.input, color: colors.text }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Printer Bed (mm)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    value={newProject.printerBedWidth}
                    onChange={(e) => setNewProject({ ...newProject, printerBedWidth: Number(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    placeholder="Width"
                    style={{ flex: 1, padding: '0.5rem', border: `1px solid ${colors.inputBorder}`, borderRadius: '4px', background: colors.input, color: colors.text }}
                  />
                  <input
                    type="number"
                    value={newProject.printerBedDepth}
                    onChange={(e) => setNewProject({ ...newProject, printerBedDepth: Number(e.target.value) })}
                    onFocus={(e) => e.target.select()}
                    placeholder="Depth"
                    style={{ flex: 1, padding: '0.5rem', border: `1px solid ${colors.inputBorder}`, borderRadius: '4px', background: colors.input, color: colors.text }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: colors.text }}>
                  <input
                    type="checkbox"
                    checked={newProject.baseplateWithMagnets}
                    onChange={(e) => setNewProject({ ...newProject, baseplateWithMagnets: e.target.checked })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ color: colors.text }}>Baseplate with magnets</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  onClick={handleCreateProject}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Create Project
                </button>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: colors.input,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: colors.surface,
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '100%'
            }}>
              <h2 style={{ color: colors.text }}>Settings</h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: colors.text, fontSize: '1.125rem', marginBottom: '1rem' }}>Display Options</h3>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  padding: '0.75rem',
                  background: colors.input,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px'
                }}>
                  <span style={{ color: colors.text, fontWeight: 'bold' }}>
                    {theme === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                  </span>
                  <button
                    onClick={toggleTheme}
                    style={{
                      padding: '0.5rem 1rem',
                      background: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Toggle
                  </button>
                </label>
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: colors.input,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: colors.surface,
              padding: '2rem',
              borderRadius: '8px',
              maxWidth: '400px',
              width: '90%',
              border: `2px solid #ef4444`
            }}>
              <h2 style={{ color: colors.text, marginTop: 0 }}>Delete Project?</h2>
              <p style={{ color: colors.textSecondary }}>
                Are you sure you want to delete "{projects.find(p => p.id === deleteConfirmId)?.name}"?
                This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  onClick={confirmDelete}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Yes, Delete
                </button>
                <button
                  onClick={cancelDelete}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: colors.input,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectsPage;
