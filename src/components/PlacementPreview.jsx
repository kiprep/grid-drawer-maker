import { useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

function PlacementPreview({ bin, gridSize, onPlace, onCancel, onRotate }) {
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const { gl } = useThree();

  // Create edges geometry for preview
  const edgesGeometry = useMemo(() => {
    const boxGeometry = new THREE.BoxGeometry(bin.width * 42, bin.height * 7, bin.depth * 42);
    return new THREE.EdgesGeometry(boxGeometry);
  }, [bin.width, bin.height, bin.depth]);

  const handlePointerMove = (e) => {
    e.stopPropagation();

    // Calculate grid position from world position
    // The grid starts at negative half-size and goes to positive half-size
    const worldX = e.point.x + (gridSize.cols * 42) / 2;
    const worldZ = e.point.z + (gridSize.rows * 42) / 2;

    // Convert to grid coordinates (snap to 42mm grid)
    const gridX = Math.floor(worldX / 42);
    const gridY = Math.floor(worldZ / 42);

    // Clamp to grid bounds (accounting for bin size)
    const clampedX = Math.max(0, Math.min(gridX, gridSize.cols - bin.width));
    const clampedY = Math.max(0, Math.min(gridY, gridSize.rows - bin.depth));

    setPreviewPos({ x: clampedX, y: clampedY });
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onPlace(previewPos.x, previewPos.y);
  };

  // Add DOM event listener for E2E testing compatibility
  useEffect(() => {
    const canvas = gl.domElement;

    const handleDOMClick = (e) => {
      // Calculate grid position from click position
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Convert normalized device coordinates to world position
      // Assuming orthographic camera looking down from above
      const worldX = (x * gridSize.cols * 42 * 0.6) + (gridSize.cols * 42) / 2;
      const worldZ = (y * gridSize.rows * 42 * 0.6) + (gridSize.rows * 42) / 2;

      // Convert to grid coordinates (snap to 42mm grid)
      const gridX = Math.floor(worldX / 42);
      const gridY = Math.floor(worldZ / 42);

      // Clamp to grid bounds (accounting for bin size)
      const clampedX = Math.max(0, Math.min(gridX, gridSize.cols - bin.width));
      const clampedY = Math.max(0, Math.min(gridY, gridSize.rows - bin.depth));

      onPlace(clampedX, clampedY);
    };

    canvas.addEventListener('click', handleDOMClick);

    return () => {
      canvas.removeEventListener('click', handleDOMClick);
    };
  }, [gl, gridSize, bin, onPlace]);

  // Add keyboard event listener for spacebar rotation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        onRotate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onRotate]);

  // Calculate world position from grid position
  // Position at the center of the bin
  const position = [
    previewPos.x * 42 + (bin.width * 42) / 2 - (gridSize.cols * 42) / 2,
    (bin.height * 7) / 2,
    previewPos.y * 42 + (bin.depth * 42) / 2 - (gridSize.rows * 42) / 2
  ];

  return (
    <>
      {/* Invisible plane to capture pointer events */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[gridSize.cols * 42, gridSize.rows * 42]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Preview bin */}
      <group position={position}>
        <mesh>
          <boxGeometry args={[bin.width * 42, bin.height * 7, bin.depth * 42]} />
          <meshStandardMaterial
            color={bin.type === 'hollow' ? '#48bb78' : '#f59e0b'}
            transparent
            opacity={0.3}
          />
        </mesh>
        {/* Preview border */}
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial
            color={bin.type === 'hollow' ? '#48bb78' : '#f59e0b'}
            linewidth={2}
            transparent
            opacity={0.8}
          />
        </lineSegments>
      </group>
    </>
  );
}

export default PlacementPreview;
