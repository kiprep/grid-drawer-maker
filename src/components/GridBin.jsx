import { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';

function RenameInput({ bin, position, isSelected, onRenameCommit, onRenameCancel }) {
  const { camera, gl } = useThree();

  // Project the bin's left and right edges to screen space to get pixel width
  const screenWidth = useMemo(() => {
    const halfW = (bin.width * 42) / 2;
    const y = position[1];
    const z = position[2];
    const left = new THREE.Vector3(position[0] - halfW, y, z).project(camera);
    const right = new THREE.Vector3(position[0] + halfW, y, z).project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    return Math.abs(right.x - left.x) * rect.width / 2;
  }, [bin.width, position, camera, gl]);

  const inputWidth = Math.max(screenWidth - 8, 60);

  return (
    <Html
      position={[0, (bin.height * 7) / 2 + 2, 0]}
      center
      style={{ pointerEvents: 'auto' }}
    >
      <input
        autoFocus
        type="text"
        defaultValue={bin.label || ''}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') onRenameCommit(e.target.value);
          else if (e.key === 'Escape') onRenameCancel();
        }}
        onBlur={(e) => onRenameCommit(e.target.value)}
        style={{
          background: isSelected ? '#e0e7ff' : '#ffffff',
          color: isSelected ? '#3730a3' : '#1a1a1a',
          border: 'none',
          borderRadius: '2px',
          padding: '4px 6px',
          fontSize: '14px',
          fontFamily: 'sans-serif',
          textAlign: 'center',
          width: `${inputWidth}px`,
          outline: `2px solid ${isSelected ? '#3730a3' : '#666'}`,
          boxSizing: 'border-box'
        }}
      />
    </Html>
  );
}

function GridBin({ bin, gridSize, isSelected, onClick, onPositionChange, onDoubleClick, isRenaming, onRenameCommit, onRenameCancel }) {
  const meshRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef(null);
  const lastClickTime = useRef(0);
  const { gl, camera, raycaster } = useThree();
  const [textBounds, setTextBounds] = useState(null);

  // Create edges geometry
  const edgesGeometry = useMemo(() => {
    const boxGeometry = new THREE.BoxGeometry(bin.width * 42, bin.height * 7, bin.depth * 42);
    return new THREE.EdgesGeometry(boxGeometry);
  }, [bin.width, bin.height, bin.depth]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    document.body.style.cursor = 'grabbing';
  };

  const handlePointerEnter = () => {
    document.body.style.cursor = 'grab';
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      document.body.style.cursor = 'auto';
    }
  };

  // Calculate world position from grid position
  // Position at the center of the bin
  const position = [
    bin.x * 42 + (bin.width * 42) / 2 - (gridSize.cols * 42) / 2,
    (bin.height * 7) / 2,
    bin.y * 42 + (bin.depth * 42) / 2 - (gridSize.rows * 42) / 2
  ];


  // Global pointer event listeners for potential dragging
  useEffect(() => {
    const canvas = gl.domElement;
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    const DRAG_THRESHOLD = 5; // pixels

    const handleGlobalPointerMove = (e) => {
      // Only track movement if we have a drag start position
      if (!dragStartPos.current) return;

      // Check if we've moved enough to start dragging
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < DRAG_THRESHOLD && !isDragging) {
        return; // Not dragging yet
      }

      // Start dragging if we've moved past threshold
      if (!isDragging) {
        setIsDragging(true);
        onClick(bin); // Select the bin when we start dragging
      }

      // Calculate mouse position in normalized device coordinates
      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Create ray from camera through mouse position
      raycaster.setFromCamera(mouse, camera);

      // Find intersection with ground plane (y=0)
      if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
        // Calculate grid position from world position
        const worldX = intersection.x + (gridSize.cols * 42) / 2;
        const worldZ = intersection.z + (gridSize.rows * 42) / 2;

        // Convert to grid coordinates (snap to 42mm grid)
        const gridX = Math.floor(worldX / 42);
        const gridY = Math.floor(worldZ / 42);

        // Clamp to grid bounds (accounting for bin size)
        const clampedX = Math.max(0, Math.min(gridX, gridSize.cols - bin.width));
        const clampedY = Math.max(0, Math.min(gridY, gridSize.rows - bin.depth));

        // Update position if changed
        if (clampedX !== bin.x || clampedY !== bin.y) {
          onPositionChange(bin.id, clampedX, clampedY);
        }
      }
    };

    const handleGlobalPointerUp = (e) => {
      const wasClick = dragStartPos.current && !isDragging;

      if (wasClick) {
        const now = Date.now();
        if (now - lastClickTime.current < 400 && onDoubleClick) {
          onDoubleClick(bin);
          lastClickTime.current = 0;
        } else {
          onClick(bin);
          lastClickTime.current = now;
        }
      }

      setIsDragging(false);
      dragStartPos.current = null;

      // Reset cursor - if still over the bin, handlePointerEnter will set it to grab
      document.body.style.cursor = 'auto';
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isDragging, gl, camera, raycaster, gridSize, bin, onPositionChange, onClick]);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={(e) => e.stopPropagation()}
      >
        <boxGeometry args={[bin.width * 42, bin.height * 7, bin.depth * 42]} />
        <meshStandardMaterial
          color={isSelected ? '#667eea' : (bin.color || (bin.type === 'hollow' ? '#48bb78' : '#f59e0b'))}
          transparent
          opacity={isDragging ? 0.6 : 0.8}
        />
      </mesh>
      {/* Border lines */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial
          color={isSelected ? '#3730a3' : '#1a1a1a'}
          linewidth={2}
          transparent
          opacity={1}
        />
      </lineSegments>

      {/* Inline rename input — sized to match the bin's screen width */}
      {isRenaming && (
        <RenameInput
          bin={bin}
          position={position}
          isSelected={isSelected}
          onRenameCommit={onRenameCommit}
          onRenameCancel={onRenameCancel}
        />
      )}

      {/* Label - only show if bin has a label and is large enough and not renaming */}
      {!isRenaming && bin.label && (bin.width >= 2 || bin.depth >= 2) && (
        <>
          {/* Text label */}
          <Text
            position={[0, (bin.height * 7) / 2 + 2, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={Math.min(bin.width * 10, bin.depth * 10, 20)}
            color={isSelected ? '#3730a3' : '#1a1a1a'}
            anchorX="center"
            anchorY="middle"
            maxWidth={(Math.min(bin.width, bin.depth) * 42) - 12}
            textAlign="center"
            onSync={(textMesh) => {
              // Get the actual rendered text bounds
              if (textMesh.textRenderInfo && textMesh.textRenderInfo.blockBounds) {
                const bounds = textMesh.textRenderInfo.blockBounds;
                const width = bounds[2] - bounds[0];
                const height = bounds[3] - bounds[1];
                setTextBounds({ width, height });
              }
            }}
          >
            {bin.label}
          </Text>

          {/* Background rectangle for label - render after text so it appears behind */}
          {textBounds && (
            <mesh
              position={[0, (bin.height * 7) / 2 + 1.5, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[textBounds.width + 6, textBounds.height + 4]} />
              <meshBasicMaterial
                color={isSelected ? '#e0e7ff' : '#ffffff'}
                transparent
                opacity={0.9}
                depthTest={false}
              />
            </mesh>
          )}
        </>
      )}
    </group>
  );
}

export default GridBin;
