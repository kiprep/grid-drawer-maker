import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useTheme } from '../context/ThemeContext';
import BinCreator from '../components/BinCreator';
import BinEditor from '../components/BinEditor';
import GridBin from '../components/GridBin';
import PlacementPreview from '../components/PlacementPreview';
import * as THREE from 'three';

// Custom grid component for precise alignment with gridfinity bins
function GridfinityGrid({ gridSize, colors }) {
  const gridWidth = gridSize.cols * 42;
  const gridDepth = gridSize.rows * 42;
  const cellSize = 42;

  // Create grid lines
  const points = [];
  const halfWidth = gridWidth / 2;
  const halfDepth = gridDepth / 2;

  // Vertical lines (along Z axis)
  for (let i = 0; i <= gridSize.cols; i++) {
    const x = i * cellSize - halfWidth;
    points.push(new THREE.Vector3(x, 0, -halfDepth));
    points.push(new THREE.Vector3(x, 0, halfDepth));
  }

  // Horizontal lines (along X axis)
  for (let i = 0; i <= gridSize.rows; i++) {
    const z = i * cellSize - halfDepth;
    points.push(new THREE.Vector3(-halfWidth, 0, z));
    points.push(new THREE.Vector3(halfWidth, 0, z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={colors.gridMain} />
    </lineSegments>
  );
}

function BinPlacerPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const [project, setProject] = useState(null);
  const [selectedBin, setSelectedBin] = useState(null);
  const [activeWidget, setActiveWidget] = useState(null);
  const [editingBin, setEditingBin] = useState(null); // bin being edited
  const [is3DMode, setIs3DMode] = useState(false);
  const [placementMode, setPlacementMode] = useState(null); // bin to place
  const [zoomLevel, setZoomLevel] = useState(1); // 0.5, 1, 1.5, 2, 2.5
  const [renamingBinId, setRenamingBinId] = useState(null);

  // Load project from localStorage
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

  // Prevent body scrolling on this page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const saveProject = (updatedProject) => {
    const savedProjects = localStorage.getItem('gridfinity-projects');
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      const updatedProjects = projects.map(p =>
        p.id === projectId ? updatedProject : p
      );
      localStorage.setItem('gridfinity-projects', JSON.stringify(updatedProjects));
      setProject(updatedProject);
    }
  };

  // Check if a bin can fit anywhere on the grid (in default rotation)
  const canBinFitAnywhere = (bin) => {
    const gridSize = {
      cols: Math.floor(project.drawerWidth / 42),
      rows: Math.floor(project.drawerDepth / 42)
    };

    // Try every position on the grid
    for (let y = 0; y <= gridSize.rows - bin.depth; y++) {
      for (let x = 0; x <= gridSize.cols - bin.width; x++) {
        // Check if this position would collide with existing bins
        const wouldCollide = (project.bins || []).some(existingBin => {
          const bin1Left = x;
          const bin1Right = x + bin.width;
          const bin1Top = y;
          const bin1Bottom = y + bin.depth;

          const bin2Left = existingBin.x;
          const bin2Right = existingBin.x + existingBin.width;
          const bin2Top = existingBin.y;
          const bin2Bottom = existingBin.y + existingBin.depth;

          const xOverlap = bin1Left < bin2Right && bin1Right > bin2Left;
          const yOverlap = bin1Top < bin2Bottom && bin1Bottom > bin2Top;

          return xOverlap && yOverlap;
        });

        if (!wouldCollide) {
          return true; // Found at least one valid position
        }
      }
    }

    return false; // No valid position found
  };

  const handleCreateBin = (newBin) => {
    // Check if bin can fit anywhere on the grid
    if (!canBinFitAnywhere(newBin)) {
      alert("This bin doesn't fit in this arrangement. Try removing or moving some bins first.");
      return;
    }

    // Enter placement mode directly
    setPlacementMode(newBin);
    setActiveWidget(null); // Close the bin creator widget
  };

  const confirmPlacement = (x, y) => {
    if (!placementMode) return;

    // Check if placement would collide with existing bins
    const wouldCollide = (project.bins || []).some(bin => {
      const bin1Left = x;
      const bin1Right = x + placementMode.width;
      const bin1Top = y;
      const bin1Bottom = y + placementMode.depth;

      const bin2Left = bin.x;
      const bin2Right = bin.x + bin.width;
      const bin2Top = bin.y;
      const bin2Bottom = bin.y + bin.depth;

      const xOverlap = bin1Left < bin2Right && bin1Right > bin2Left;
      const yOverlap = bin1Top < bin2Bottom && bin1Bottom > bin2Top;

      return xOverlap && yOverlap;
    });

    if (wouldCollide) {
      // Don't place bin if it would overlap with existing bins
      return;
    }

    const placedBin = {
      ...placementMode,
      x,
      y,
      placed: true
    };

    const updatedProject = {
      ...project,
      bins: [...(project.bins || []), placedBin]
    };

    saveProject(updatedProject);

    // Exit placement mode
    setPlacementMode(null);
  };

  const cancelPlacement = () => {
    // Discard the bin being placed
    setPlacementMode(null);
  };

  const handleRotatePlacement = () => {
    if (!placementMode) return;

    // Swap width and depth to rotate 90 degrees
    setPlacementMode({
      ...placementMode,
      width: placementMode.depth,
      depth: placementMode.width
    });
  };

  const checkBinCollision = (binId, x, y, width, depth) => {
    // Check if bin at position (x,y) with given dimensions collides with any other bin
    return project.bins.some(bin => {
      if (bin.id === binId) return false; // Don't check against self

      // Check if rectangles overlap
      const bin1Left = x;
      const bin1Right = x + width;
      const bin1Top = y;
      const bin1Bottom = y + depth;

      const bin2Left = bin.x;
      const bin2Right = bin.x + bin.width;
      const bin2Top = bin.y;
      const bin2Bottom = bin.y + bin.depth;

      // Rectangles overlap if they intersect on both axes
      const xOverlap = bin1Left < bin2Right && bin1Right > bin2Left;
      const yOverlap = bin1Top < bin2Bottom && bin1Bottom > bin2Top;

      return xOverlap && yOverlap;
    });
  };

  const handleBinPositionChange = (binId, x, y) => {
    const movingBin = project.bins.find(b => b.id === binId);
    if (!movingBin) return;

    // Check for collision before allowing the move
    if (checkBinCollision(binId, x, y, movingBin.width, movingBin.depth)) {
      return; // Don't allow move if it would cause collision
    }

    const updatedBins = project.bins.map(bin =>
      bin.id === binId ? { ...bin, x, y } : bin
    );

    const updatedProject = {
      ...project,
      bins: updatedBins
    };

    saveProject(updatedProject);
  };

  const handleDeletePlacedBin = (binId) => {
    // Remove from project
    const updatedProject = {
      ...project,
      bins: project.bins.filter(b => b.id !== binId)
    };
    saveProject(updatedProject);

    if (selectedBin?.id === binId) {
      setSelectedBin(null);
    }
    if (renamingBinId === binId) {
      setRenamingBinId(null);
    }
  };

  const toggleWidget = (widgetName) => {
    setActiveWidget(activeWidget === widgetName ? null : widgetName);
    setSelectedBin(null); // Deselect bin when opening/closing widgets
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setIs3DMode(false);
    setSelectedBin(null);
  };

  const handleRotateBin = (binId) => {
    const binToRotate = project.bins.find(b => b.id === binId);
    if (!binToRotate) return;

    // New dimensions after rotation
    const newWidth = binToRotate.depth;
    const newDepth = binToRotate.width;

    // Try multiple positions around and within the bin's current footprint
    // This allows rotation in "both directions" by trying different anchor points
    const candidatePositions = [];

    // Strategy: Try positions in a search area around the current bin
    // extending from the bin's boundaries in all directions
    const searchMinX = Math.max(0, binToRotate.x - Math.max(binToRotate.width, binToRotate.depth));
    const searchMaxX = Math.min(gridSize.cols - newWidth, binToRotate.x + Math.max(binToRotate.width, binToRotate.depth));
    const searchMinY = Math.max(0, binToRotate.y - Math.max(binToRotate.width, binToRotate.depth));
    const searchMaxY = Math.min(gridSize.rows - newDepth, binToRotate.y + Math.max(binToRotate.width, binToRotate.depth));

    // Collect candidate positions in a spiral-like pattern starting from the current position
    // This prioritizes positions closer to the original position
    for (let distance = 0; distance <= Math.max(Math.abs(searchMaxX - searchMinX), Math.abs(searchMaxY - searchMinY)); distance++) {
      for (let dx = -distance; dx <= distance; dx++) {
        for (let dy = -distance; dy <= distance; dy++) {
          if (Math.abs(dx) === distance || Math.abs(dy) === distance) {
            const candidateX = binToRotate.x + dx;
            const candidateY = binToRotate.y + dy;

            // Check if this position is within the search area
            if (candidateX >= searchMinX && candidateX <= searchMaxX &&
                candidateY >= searchMinY && candidateY <= searchMaxY) {
              candidatePositions.push({ x: candidateX, y: candidateY });
            }
          }
        }
      }
    }

    // Try each candidate position as the new origin for the rotated bin
    let validRotation = null;
    for (const pos of candidatePositions) {
      // Check if rotated bin fits in grid bounds from this position
      if (pos.x >= 0 && pos.y >= 0 &&
          pos.x + newWidth <= gridSize.cols && pos.y + newDepth <= gridSize.rows) {
        // Check for collision with other bins at this position
        if (!checkBinCollision(binId, pos.x, pos.y, newWidth, newDepth)) {
          // Found a valid position!
          validRotation = {
            ...binToRotate,
            x: pos.x,
            y: pos.y,
            width: newWidth,
            depth: newDepth
          };
          break;
        }
      }
    }

    // If no valid rotation found, return without rotating
    if (!validRotation) {
      return;
    }

    const updatedBins = project.bins.map(bin =>
      bin.id === binId ? validRotation : bin
    );

    const updatedProject = {
      ...project,
      bins: updatedBins
    };

    saveProject(updatedProject);

    // Update selected bin to show new dimensions
    setSelectedBin(validRotation);
  };

  const handleEditBin = (binId) => {
    const binToEdit = project.bins.find(b => b.id === binId);
    if (!binToEdit) return;
    setEditingBin(binToEdit);
  };

  const handleSaveEditedBin = (updatedBin) => {
    const updatedBins = project.bins.map(bin =>
      bin.id === updatedBin.id ? updatedBin : bin
    );

    const updatedProject = {
      ...project,
      bins: updatedBins
    };

    saveProject(updatedProject);

    // Update selected bin to reflect changes
    setSelectedBin(updatedBin);
    setEditingBin(null);
  };

  // Generate a smart copy name with incrementing numbers
  const generateCopyName = (originalName) => {
    if (!originalName) return '';

    // Check if name already has a number in parentheses at the end
    const match = originalName.match(/^(.+?)\s*\((\d+)\)$/);

    if (match) {
      // Has a number, increment it
      const baseName = match[1];
      const currentNumber = parseInt(match[2], 10);
      return `${baseName} (${currentNumber + 1})`;
    } else {
      // No number, add (2)
      return `${originalName} (2)`;
    }
  };

  const handleCopyBin = (binId) => {
    const binToCopy = project.bins.find(b => b.id === binId);
    if (!binToCopy) return;

    // Create a copy with new ID and updated label
    const copiedBin = {
      ...binToCopy,
      id: Date.now().toString(),
      label: generateCopyName(binToCopy.label || `${binToCopy.type === 'hollow' ? 'Hollow' : 'Solid'} Bin`)
    };

    // Remove position so it needs to be placed
    delete copiedBin.x;
    delete copiedBin.y;

    // Check if copy can fit anywhere
    if (!canBinFitAnywhere(copiedBin)) {
      alert("Cannot create a copy - no space available on the grid.");
      return;
    }

    // Enter placement mode with the copy
    setPlacementMode(copiedBin);
    setSelectedBin(null);
  };

  const handleDoubleClickBin = (bin) => {
    setSelectedBin(bin);
    setRenamingBinId(bin.id);
  };

  const commitRename = (binId, value) => {
    const trimmed = value.trim();
    const updatedBins = project.bins.map(b =>
      b.id === binId ? { ...b, label: trimmed || b.label } : b
    );
    const updatedProject = { ...project, bins: updatedBins };
    saveProject(updatedProject);
    if (selectedBin?.id === binId) {
      setSelectedBin({ ...selectedBin, label: trimmed || selectedBin.label });
    }
    setRenamingBinId(null);
  };

  const canCopyFit = (binId) => {
    if (!binId || !project) return false;

    const binToCopy = project.bins.find(b => b.id === binId);
    if (!binToCopy) return false;

    // Create temporary copy to check if it fits
    const tempCopy = {
      width: binToCopy.width,
      depth: binToCopy.depth,
      height: binToCopy.height
    };

    return canBinFitAnywhere(tempCopy);
  };

  // WASD keyboard controls for moving selected bin + spacebar for rotation
  useEffect(() => {
    if (!selectedBin || !project) return;

    const gridSize = {
      cols: Math.floor(project.drawerWidth / 42),
      rows: Math.floor(project.drawerDepth / 42)
    };

    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Spacebar to rotate selected bin
      if (e.code === 'Space') {
        e.preventDefault();
        handleRotateBin(selectedBin.id);
        return;
      }

      // Delete/Backspace to remove selected bin
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeletePlacedBin(selectedBin.id);
        return;
      }

      let newX = selectedBin.x;
      let newY = selectedBin.y;
      let moved = false;

      switch (e.key.toLowerCase()) {
        case 'w':
          // Move up (decrease y)
          newY = Math.max(0, selectedBin.y - 1);
          moved = true;
          break;
        case 'a':
          // Move left (decrease x)
          newX = Math.max(0, selectedBin.x - 1);
          moved = true;
          break;
        case 's':
          // Move down (increase y)
          newY = Math.min(gridSize.rows - selectedBin.depth, selectedBin.y + 1);
          moved = true;
          break;
        case 'd':
          // Move right (increase x)
          newX = Math.min(gridSize.cols - selectedBin.width, selectedBin.x + 1);
          moved = true;
          break;
        default:
          break;
      }

      if (moved && (newX !== selectedBin.x || newY !== selectedBin.y)) {
        // Check for collision before moving
        if (!checkBinCollision(selectedBin.id, newX, newY, selectedBin.width, selectedBin.depth)) {
          // Update bin position
          handleBinPositionChange(selectedBin.id, newX, newY);

          // Update selectedBin to keep it selected with new position
          setSelectedBin({ ...selectedBin, x: newX, y: newY });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedBin, project]);

  if (!project) {
    return <div>Loading...</div>;
  }

  const gridSize = {
    cols: Math.floor(project.drawerWidth / 42),
    rows: Math.floor(project.drawerDepth / 42)
  };

  // Calculate orthographic camera frustum based on grid size
  const gridDiagonal = Math.sqrt((gridSize.cols * 42) ** 2 + (gridSize.rows * 42) ** 2);
  const cameraDistance = Math.max(gridDiagonal * 1.2, 400);

  // Orthographic camera frustum size (adjusted by zoom)
  const frustumSize = (Math.max(gridSize.cols * 42, gridSize.rows * 42) * 0.6) / zoomLevel;

  return (
    <div style={{
      display: 'flex',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100vh',
      width: '100vw',
      background: colors.background,
      overflow: 'hidden'
    }}>
      {/* Main Canvas Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        minWidth: 0,
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Top Left - Back Button */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          zIndex: 10
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
              color: colors.primary
            }}
          >
            ← Back to Projects
          </button>
        </div>

        {/* Center - Project Title */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: colors.surface,
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '50%',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</h2>
        </div>

        {/* Upper Right - Create Bin Icon */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 10
        }}>
          <button
            onClick={() => toggleWidget('create')}
            style={{
              width: '60px',
              height: '60px',
              background: activeWidget === 'create' ? colors.primary : colors.surface,
              color: activeWidget === 'create' ? 'white' : colors.text,
              border: `2px solid ${activeWidget === 'create' ? colors.primary : colors.border}`,
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}
            title="Create New Bin"
            onMouseOver={(e) => {
              if (activeWidget !== 'create') {
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ➕
          </button>
        </div>

        {/* 3D Canvas */}
        <Canvas
          orthographic={!is3DMode}
          camera={
            is3DMode
              ? {
                  position: [cameraDistance * 0.6, cameraDistance * 0.6, cameraDistance * 0.6],
                  fov: 60
                }
              : {
                  position: [0, cameraDistance, 0.1],
                  zoom: zoomLevel * 2,
                  near: 0.1,
                  far: cameraDistance * 2
                }
          }
          style={{ background: colors.canvasBg, width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />

          {/* Gridfinity Grid */}
          <GridfinityGrid gridSize={gridSize} colors={colors} />

          {/* Invisible plane to capture clicks on empty space (deselect bin) */}
          {!placementMode && (
            <mesh
              position={[0, -0.1, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                // Only deselect if this is the actual target (not a bin above)
                if (e.eventObject === e.object) {
                  setSelectedBin(null);
                }
                e.stopPropagation();
              }}
            >
              <planeGeometry args={[gridSize.cols * 42, gridSize.rows * 42]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          )}

          {/* Placed Bins */}
          {project.bins && project.bins.map((bin) => (
            <GridBin
              key={bin.id}
              bin={bin}
              gridSize={gridSize}
              isSelected={selectedBin?.id === bin.id}
              onClick={setSelectedBin}
              onPositionChange={handleBinPositionChange}
              onDoubleClick={handleDoubleClickBin}
              isRenaming={renamingBinId === bin.id}
              onRenameCommit={(value) => commitRename(bin.id, value)}
              onRenameCancel={() => setRenamingBinId(null)}
            />
          ))}

          {/* Placement Preview */}
          {placementMode && (
            <PlacementPreview
              bin={placementMode}
              gridSize={gridSize}
              onPlace={confirmPlacement}
              onCancel={cancelPlacement}
              onRotate={handleRotatePlacement}
            />
          )}

          <OrbitControls
            enableRotate={is3DMode}
            enablePan={true}
            enableZoom={false}
            enabled={!placementMode}
          />
        </Canvas>

        {/* Bottom Left - View Controls */}
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '1rem',
          zIndex: 10,
          background: colors.surface,
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minWidth: '200px',
          maxWidth: '280px',
          color: colors.text,
          maxHeight: 'calc(100vh - 10rem)',
          overflowY: 'auto'
        }}>
          {placementMode ? (
            <>
              <div style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                padding: '0.75rem',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}>
                <strong style={{ color: '#92400e' }}>Placement Mode</strong>
                <p style={{ fontSize: '0.75rem', color: '#92400e', margin: '0.25rem 0 0 0' }}>
                  Click to place • Spacebar to rotate
                </p>
              </div>
              <button
                onClick={cancelPlacement}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: colors.danger,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
            </>
          ) : selectedBin ? (
            <>
              <div style={{
                background: colors.input,
                border: `2px solid ${colors.primary}`,
                padding: '0.75rem',
                borderRadius: '4px',
                marginBottom: '0.75rem'
              }}>
                <strong style={{ color: colors.text, display: 'block', marginBottom: '0.5rem' }}>✓ Selected Bin</strong>
                <p style={{ fontSize: '0.875rem', color: colors.text, margin: '0.25rem 0' }}>
                  {selectedBin.label || `${selectedBin.type === 'hollow' ? 'Hollow' : 'Solid'} Bin`}
                </p>
                <p style={{ fontSize: '0.75rem', color: colors.textSecondary, margin: '0.25rem 0' }}>
                  {selectedBin.type === 'hollow' ? 'Hollow' : 'Solid'} • {selectedBin.width}x{selectedBin.depth}x{selectedBin.height} units
                </p>
                <p style={{ fontSize: '0.75rem', color: colors.textSecondary, margin: '0.25rem 0 0 0' }}>
                  ({selectedBin.width * 42}×{selectedBin.depth * 42}×{selectedBin.height * 7}mm)
                </p>
              </div>

              {/* Edit and Copy buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  onClick={() => handleEditBin(selectedBin.id)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}
                  title="Edit bin properties"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleCopyBin(selectedBin.id)}
                  disabled={!canCopyFit(selectedBin.id)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: canCopyFit(selectedBin.id) ? colors.success : colors.input,
                    color: canCopyFit(selectedBin.id) ? 'white' : colors.textSecondary,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: canCopyFit(selectedBin.id) ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    opacity: canCopyFit(selectedBin.id) ? 1 : 0.6
                  }}
                  title={canCopyFit(selectedBin.id) ? "Create a copy of this bin" : "No space available for a copy"}
                >
                  📋 Copy
                </button>
              </div>

              <button
                onClick={() => handleRotateBin(selectedBin.id)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  marginBottom: '0.75rem'
                }}
              >
                ↻ Rotate 90°
              </button>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  onClick={() => handleDeletePlacedBin(selectedBin.id)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: colors.danger,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}
                >
                  🗑 Remove
                </button>
                <button
                  onClick={() => setSelectedBin(null)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: colors.input,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Deselect
                </button>
              </div>
              <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: `1px solid ${colors.border}` }} />
            </>
          ) : project.bins && project.bins.length > 0 ? (
            <div style={{
              background: colors.input,
              border: `1px dashed ${colors.border}`,
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '0.75rem'
            }}>
              <p style={{ fontSize: '0.75rem', color: colors.textSecondary, margin: 0, fontStyle: 'italic' }}>
                💡 Click any bin to select and move or remove it
              </p>
            </div>
          ) : null}

          {/* Zoom Controls */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: colors.text, fontWeight: 'bold' }}>
              Zoom
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: zoomLevel <= 0.5 ? colors.input : colors.primary,
                  color: zoomLevel <= 0.5 ? colors.textSecondary : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: zoomLevel <= 0.5 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                −
              </button>
              <div style={{
                flex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: colors.input,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '0.875rem',
                color: colors.text
              }}>
                {Math.round(zoomLevel * 100)}%
              </div>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2.5}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  background: zoomLevel >= 2.5 ? colors.input : colors.primary,
                  color: zoomLevel >= 2.5 ? colors.textSecondary : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: zoomLevel >= 2.5 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* 3D Mode Toggle */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: colors.text }}>
              <input
                type="checkbox"
                checked={is3DMode}
                onChange={(e) => {
                  setIs3DMode(e.target.checked);
                  setSelectedBin(null);
                }}
                style={{ marginRight: '0.5rem' }}
              />
              <span style={{ color: colors.text }}>3D View</span>
            </label>
          </div>

          {/* Reset View Button */}
          <button
            onClick={handleResetView}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: colors.input,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: '0.75rem'
            }}
          >
            Reset View
          </button>

          {/* Info */}
          <div style={{ fontSize: '0.875rem', color: colors.textSecondary }}>
            Max Height: {project.drawerHeight}mm
          </div>
        </div>


      </div>

      {/* Floating Create Bin Panel */}
      {activeWidget === 'create' && (
        <div style={{
          position: 'absolute',
          top: '5rem',
          right: '1rem',
          width: '400px',
          maxHeight: 'calc(100vh - 7rem)',
          background: colors.surface,
          border: `2px solid ${colors.primary}`,
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header with close button */}
          <div style={{
            padding: '1rem',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: colors.primary,
            color: 'white'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Create New Bin</h3>
            <button
              onClick={() => setActiveWidget(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1rem'
          }}>
            <BinCreator
              onCreateBin={handleCreateBin}
              maxHeight={project.drawerHeight}
              printerBedWidth={project.printerBedWidth}
              printerBedDepth={project.printerBedDepth}
            />
          </div>
        </div>
      )}

      {/* Floating Bin Editor Panel */}
      {editingBin && (
        <div style={{
          position: 'absolute',
          top: '5rem',
          right: '1rem',
          width: '400px',
          maxHeight: 'calc(100vh - 7rem)',
          background: colors.surface,
          border: `2px solid ${colors.warning}`,
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header with close button */}
          <div style={{
            padding: '1rem',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: colors.warning,
            color: 'white'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Edit Bin</h3>
            <button
              onClick={() => setEditingBin(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1rem'
          }}>
            <BinEditor
              bin={editingBin}
              onSaveBin={handleSaveEditedBin}
              onClose={() => setEditingBin(null)}
              maxHeight={project.drawerHeight}
              printerBedWidth={project.printerBedWidth}
              printerBedDepth={project.printerBedDepth}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default BinPlacerPage;
