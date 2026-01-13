import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

// Grid component for the preview
function PreviewGrid({ binWidth, binDepth }) {
  const { colors } = useTheme();

  // Create grid lines extending from the bin
  const gridSize = Math.max(binWidth, binDepth) + 2; // Extra cells around the bin
  const cellSize = 42;
  const halfWidth = (gridSize * cellSize) / 2;
  const halfDepth = (gridSize * cellSize) / 2;

  const points = [];

  // Vertical lines (along Z axis)
  for (let i = 0; i <= gridSize; i++) {
    const x = i * cellSize - halfWidth;
    points.push(new THREE.Vector3(x, 0, -halfDepth));
    points.push(new THREE.Vector3(x, 0, halfDepth));
  }

  // Horizontal lines (along X axis)
  for (let i = 0; i <= gridSize; i++) {
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

// The bin mesh
function PreviewBin({ width, depth, height, type, color: customColor }) {
  const binWidth = width * 42;
  const binDepth = depth * 42;
  const binHeight = height * 7;

  // Create edges geometry for outline
  const edgesGeometry = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(binWidth, binHeight, binDepth)
  );

  const color = customColor || (type === 'hollow' ? '#48bb78' : '#f59e0b');

  return (
    <group position={[0, binHeight / 2, 0]}>
      <mesh>
        <boxGeometry args={[binWidth, binHeight, binDepth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Border lines */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial
          color="#1a1a1a"
          linewidth={2}
          transparent
          opacity={1}
        />
      </lineSegments>
    </group>
  );
}

function BinPreview({ binConfig }) {
  const { colors } = useTheme();

  return (
    <div style={{
      width: '100%',
      height: '250px',
      background: colors.background,
      borderRadius: '8px',
      border: `2px solid ${colors.border}`,
      overflow: 'hidden',
      position: 'relative'
    }}>
      <Canvas
        camera={{ position: [150, 100, 150], fov: 50 }}
        style={{ background: colors.background }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

        {/* Grid */}
        <PreviewGrid binWidth={binConfig.width} binDepth={binConfig.depth} />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color={colors.surface} transparent opacity={0.3} />
        </mesh>

        {/* Preview Bin */}
        <PreviewBin
          width={binConfig.width}
          depth={binConfig.depth}
          height={binConfig.height}
          type={binConfig.type || 'hollow'}
          color={binConfig.color}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={100}
          maxDistance={400}
        />
      </Canvas>

      {/* Dimension labels */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontFamily: 'monospace'
      }}>
        {binConfig.width}×{binConfig.depth}×{binConfig.height} units
        <br />
        ({binConfig.width * 42}×{binConfig.depth * 42}×{binConfig.height * 7}mm)
      </div>
    </div>
  );
}

export default BinPreview;
