import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeContext';

function PlateBed({ width, depth }) {
  const { colors } = useTheme();

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color={colors.canvasBg} transparent opacity={0.5} />
    </mesh>
  );
}

function PlateBedOutline({ width, depth }) {
  const points = [
    new THREE.Vector3(-width / 2, 0.1, -depth / 2),
    new THREE.Vector3(width / 2, 0.1, -depth / 2),
    new THREE.Vector3(width / 2, 0.1, depth / 2),
    new THREE.Vector3(-width / 2, 0.1, depth / 2),
    new THREE.Vector3(-width / 2, 0.1, -depth / 2),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#888888" />
    </line>
  );
}

function PackedBin({ item, plateWidth, plateDepth, isFailed, onClick }) {
  const binWidth = item.width;
  const binDepth = item.depth;
  const binHeight = item.binData.height * 7;

  const x = item.x + binWidth / 2 - plateWidth / 2;
  const z = item.y + binDepth / 2 - plateDepth / 2;

  const defaultColor = item.binData.type === 'hollow' ? '#48bb78' : '#f59e0b';
  const color = isFailed ? '#ef4444' : (item.binData.color || defaultColor);
  const opacity = isFailed ? 0.6 : 0.8;

  const edgesGeometry = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(binWidth, binHeight, binDepth)
  );

  return (
    <group
      position={[x, binHeight / 2, z]}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
    >
      <mesh>
        <boxGeometry args={[binWidth, binHeight, binDepth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
        />
      </mesh>
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={isFailed ? '#991b1b' : '#1a1a1a'} linewidth={2} />
      </lineSegments>
    </group>
  );
}

function PlatePreview3D({ plate, failedBinIds = [], onBinClick = null }) {
  const { colors } = useTheme();

  const diagonal = Math.sqrt(plate.width ** 2 + plate.depth ** 2);
  const cameraDistance = Math.max(diagonal * 0.8, 200);

  return (
    <div style={{
      width: '100%',
      height: '250px',
      background: colors.background,
      borderRadius: '8px',
      border: `2px solid ${colors.border}`,
      overflow: 'hidden',
      position: 'relative',
      marginBottom: '0.75rem'
    }}>
      <Canvas
        camera={{
          position: [cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7],
          fov: 50
        }}
        style={{ background: colors.background }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

        <PlateBed width={plate.width} depth={plate.depth} />
        <PlateBedOutline width={plate.width} depth={plate.depth} />

        {plate.items.map((item, idx) => (
          <PackedBin
            key={idx}
            item={item}
            plateWidth={plate.width}
            plateDepth={plate.depth}
            isFailed={failedBinIds.includes(idx)}
            onClick={onBinClick ? () => onBinClick(idx) : null}
          />
        ))}

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={100}
          maxDistance={cameraDistance * 2}
        />
      </Canvas>

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
        {plate.width}x{plate.depth}mm bed
        {plate.items.length > 0 && ` \u2022 ${plate.items.length} bin${plate.items.length === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}

export default PlatePreview3D;
