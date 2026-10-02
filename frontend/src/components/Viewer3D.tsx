import React, { useRef, useState, useEffect, Suspense, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, useGLTF, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import { 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  Eye, 
  Grid as GridIcon, 
  Sun, 
  Camera, 
  Layers, 
  RefreshCw,
  Box as BoxIcon
} from 'lucide-react';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
  resetKey?: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class Safe3DErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: any) {
    console.error('3D Model loader caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-navy-950/90 text-slate-300 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <BoxIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-300 font-mono">3D Model Rendering Error</h4>
            <p className="text-xs text-slate-400 mt-1">Unable to load the generated 3D container. Try generating in OBJ or STL format.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ModelProps {
  url?: string;
  wireframe: boolean;
  autoRotate: boolean;
  geometryType?: string;
}

function LoadedModel({ url, wireframe, autoRotate }: { url: string; wireframe: boolean; autoRotate: boolean }) {
  const { scene } = useGLTF(url);
  const meshRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!scene) return;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: any) => {
            if (mat && 'wireframe' in mat) {
              mat.wireframe = wireframe;
            }
          });
        } else if (mesh.material && 'wireframe' in mesh.material) {
          (mesh.material as any).wireframe = wireframe;
        }
      }
    });
  }, [scene, wireframe]);

  useFrame((_, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={meshRef}>
      <Center>
        <primitive object={scene} scale={1.5} />
      </Center>
    </group>
  );
}

// Procedural 3D Mesh preview for mock generation / fallback visualizer
function ProceduralAiMesh({ wireframe, autoRotate, geometryType = 'crystal' }: ModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.15;
    }
  });

  return (
    <group>
      <Center>
        <mesh ref={meshRef} castShadow receiveShadow>
          {geometryType === 'crystal' ? (
            <octahedronGeometry args={[1.6, 2]} />
          ) : geometryType === 'torus' ? (
            <torusKnotGeometry args={[1.2, 0.4, 128, 32]} />
          ) : (
            <dodecahedronGeometry args={[1.5, 1]} />
          )}
          <meshStandardMaterial
            color="#00F0FF"
            emissive="#071841"
            roughness={0.25}
            metalness={0.85}
            wireframe={wireframe}
          />
        </mesh>
      </Center>
    </group>
  );
}

interface Viewer3DProps {
  modelUrl?: string;
  className?: string;
  fallbackName?: string;
}

export const Viewer3D: React.FC<Viewer3DProps> = ({ modelUrl, className = '', fallbackName = 'Generated Mesh' }) => {
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [lightIntensity, setLightIntensity] = useState(1.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [geoVariation, setGeoVariation] = useState<'crystal' | 'torus' | 'dodecahedron'>('crystal');
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const resetCamera = () => {
    setCameraKey((prev) => prev + 1);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-[480px] bg-[#030917] rounded-2xl border border-blue-500/20 overflow-hidden shadow-2xl flex flex-col ${className}`}
    >
      {/* Top Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-navy-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-blue-500/30 text-xs font-mono text-cyan-300 pointer-events-auto">
          <BoxIcon className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>{modelUrl ? '3D Mesh Viewport' : `${fallbackName} (Local Engine)`}</span>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1.5 bg-navy-900/80 backdrop-blur-md p-1 rounded-xl border border-blue-500/30 pointer-events-auto">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pause Rotation' : 'Auto Rotate'}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              autoRotate ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          </button>

          <button
            onClick={() => setWireframe(!wireframe)}
            title="Toggle Wireframe"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              wireframe ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Floor Grid"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showGrid ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <GridIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setLightIntensity(lightIntensity === 1.5 ? 2.5 : 1.5)}
            title="Toggle High Lighting"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              lightIntensity > 1.5 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-4 h-4" />
          </button>

          <button
            onClick={resetCamera}
            title="Reset Camera View"
            className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              const modes: ('crystal' | 'torus' | 'dodecahedron')[] = ['crystal', 'torus', 'dodecahedron'];
              const nextIdx = (modes.indexOf(geoVariation) + 1) % modes.length;
              setGeoVariation(modes[nextIdx]);
            }}
            title="Cycle Preview Topology"
            className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="w-full h-full cursor-grab active:cursor-grabbing">
        <Safe3DErrorBoundary
          resetKey={modelUrl}
          fallback={
            <Canvas
              key={`fallback-${cameraKey}`}
              camera={{ position: [0, 2, 4.5], fov: 45 }}
              shadows={{ type: THREE.PCFShadowMap }}
            >
              <ambientLight intensity={0.6 * lightIntensity} />
              <directionalLight position={[10, 10, 5]} intensity={1.2 * lightIntensity} castShadow />
              <pointLight position={[0, 4, 0]} intensity={0.8} color="#00F0FF" />
              <ProceduralAiMesh wireframe={wireframe} autoRotate={autoRotate} geometryType={geoVariation} />
              {showGrid && (
                <Grid
                  renderOrder={-1}
                  position={[0, -1.2, 0]}
                  infiniteGrid
                  cellSize={0.4}
                  cellThickness={0.6}
                  cellColor="#0099FF"
                  sectionSize={2.0}
                  sectionThickness={1.2}
                  sectionColor="#00F0FF"
                  fadeDistance={25}
                  fadeStrength={1.5}
                />
              )}
              <OrbitControls enableDamping dampingFactor={0.05} minDistance={1.5} maxDistance={12} />
            </Canvas>
          }
        >
          <Canvas
            key={cameraKey}
            camera={{ position: [0, 2, 4.5], fov: 45 }}
            shadows={{ type: THREE.PCFShadowMap }}
          >
            <ambientLight intensity={0.6 * lightIntensity} />
            <directionalLight position={[10, 10, 5]} intensity={1.2 * lightIntensity} castShadow />
            <directionalLight position={[-10, -10, -5]} intensity={0.4 * lightIntensity} color="#0099FF" />
            <pointLight position={[0, 4, 0]} intensity={0.8} color="#00F0FF" />

            <Suspense
              fallback={
                <Html center>
                  <div className="flex flex-col items-center gap-2 bg-navy-900/90 border border-cyan-500/30 px-4 py-2.5 rounded-xl backdrop-blur-md">
                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-cyan-200 font-mono">Loading 3D mesh...</span>
                  </div>
                </Html>
              }
            >
              {modelUrl ? (
                <LoadedModel url={modelUrl} wireframe={wireframe} autoRotate={autoRotate} />
              ) : (
                <Html center>
                  <div className="flex flex-col items-center gap-2.5 bg-navy-950/80 border border-blue-500/30 px-5 py-4 rounded-2xl backdrop-blur-md text-center pointer-events-none">
                    <BoxIcon className="w-8 h-8 text-cyan-400/50 animate-pulse" />
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-200">3D Viewport Standby</p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">Upload a 2D image and click Generate to reconstruct mesh</p>
                    </div>
                  </div>
                </Html>
              )}
            </Suspense>

            {showGrid && (
              <Grid
                renderOrder={-1}
                position={[0, -1.2, 0]}
                infiniteGrid
                cellSize={0.4}
                cellThickness={0.6}
                cellColor="#0099FF"
                sectionSize={2.0}
                sectionThickness={1.2}
                sectionColor="#00F0FF"
                fadeDistance={25}
                fadeStrength={1.5}
              />
            )}

            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              minDistance={1.5}
              maxDistance={12}
              maxPolarAngle={Math.PI / 2 + 0.1}
            />
          </Canvas>
        </Safe3DErrorBoundary>
      </div>

      {/* Instructions footer */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-slate-400 font-mono pointer-events-none">
        <div className="flex items-center gap-3 bg-navy-950/70 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/5">
          <span>🖱️ Left-click: Orbit</span>
          <span>🖱️ Right-click: Pan</span>
          <span>📜 Scroll: Zoom</span>
        </div>
        <div className="bg-navy-950/70 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/5 text-cyan-400 flex items-center gap-1">
          <Eye className="w-3 h-3" />
          <span>Interactive WebGL 2.0</span>
        </div>
      </div>
    </div>
  );
};
