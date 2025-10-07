import React, { useEffect, useRef } from 'react';

// Lazy import di three per evitare pesi inutili al primo paint
let THREERef = null;
async function ensureThree() {
  if (!THREERef) {
    THREERef = await import('three');
  }
  return THREERef;
}

export default function ThreeBackground({ enabled = false, modelUrl = '', preset = 'snow', intensity = 70 }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const particlesRef = useRef(null);
  const modelRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    (async () => {
      const THREE = await ensureThree();
      if (disposed) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.set(0, 0, 60);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);

      // Presets di sfondo
      const effectIntensity = Math.max(10, Math.min(100, intensity));
      if (preset === 'particles' || preset === 'snow') {
        const particleCount = Math.floor(600 + effectIntensity * 4);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
          positions[i * 3] = (Math.random() - 0.5) * (150 + effectIntensity);
          positions[i * 3 + 1] = (Math.random() - 0.5) * (90 + effectIntensity * 0.6);
          positions[i * 3 + 2] = (Math.random() - 0.5) * (150 + effectIntensity);
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const color = preset === 'snow' ? 0xffffff : 0x8b5cf6;
        const material = new THREE.PointsMaterial({ color, size: 1 + effectIntensity / 100, sizeAttenuation: true });
        const particles = new THREE.Points(geometry, material);
        particlesRef.current = particles;
        scene.add(particles);
      } else if (preset === 'grid') {
        const grid = new THREE.Group();
        const size = 200;
        const div = 20 + Math.floor(effectIntensity / 5);
        const color = 0x8b5cf6;
        const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
        for (let i = -div; i <= div; i++) {
          const geo1 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-size, -20, (i / div) * size),
            new THREE.Vector3(size, -20, (i / div) * size)
          ]);
          const line1 = new THREE.Line(geo1, material);
          grid.add(line1);
          const geo2 = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3((i / div) * size, -20, -size),
            new THREE.Vector3((i / div) * size, -20, size)
          ]);
          const line2 = new THREE.Line(geo2, material);
          grid.add(line2);
        }
        particlesRef.current = grid;
        scene.add(grid);
      } else if (preset === 'aurora') {
        const geometry = new THREE.PlaneGeometry(200, 120, 64, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.2, wireframe: false });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, -30);
        particlesRef.current = mesh;
        scene.add(mesh);
      }

      // Luci minime
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(5, 10, 7);
      scene.add(dir);

      // Carica modello opzionale
      if (modelUrl) {
        try {
          const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
          const loader = new GLTFLoader();
          loader.load(
            modelUrl,
            (gltf) => {
              modelRef.current = gltf.scene;
              gltf.scene.scale.set(12, 12, 12);
              gltf.scene.position.set(0, -10, 0);
              scene.add(gltf.scene);
            },
            undefined,
            (err) => console.error('GLTF load error:', err)
          );
        } catch (e) {
          console.warn('GLTF loader non disponibile:', e);
        }
      }

      const onResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      const animate = () => {
        animationRef.current = requestAnimationFrame(animate);
        if (particlesRef.current) {
          if (preset === 'particles') {
            particlesRef.current.rotation.y += 0.0008;
            particlesRef.current.rotation.x += 0.0004;
          } else if (preset === 'snow') {
            const pos = particlesRef.current.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
              pos.array[i * 3 + 1] -= 0.15 + effectIntensity * 0.003; // fall speed
              if (pos.array[i * 3 + 1] < -70) {
                pos.array[i * 3 + 1] = 70;
                pos.array[i * 3] = (Math.random() - 0.5) * (150 + effectIntensity);
                pos.array[i * 3 + 2] = (Math.random() - 0.5) * (150 + effectIntensity);
              }
            }
            pos.needsUpdate = true;
          } else if (preset === 'grid') {
            particlesRef.current.rotation.z += 0.0005;
          } else if (preset === 'aurora') {
            particlesRef.current.position.y = Math.sin(Date.now() * 0.0005) * 5;
          }
        }
        if (modelRef.current) {
          modelRef.current.rotation.y += 0.003;
        }
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        window.removeEventListener('resize', onResize);
      };
    })();

    return () => {
      disposed = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        const canvas = rendererRef.current.domElement;
        canvas && canvas.parentNode && canvas.parentNode.removeChild(canvas);
      }
      if (sceneRef.current) {
        // Best-effort cleanup
        sceneRef.current.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose?.();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
            else obj.material.dispose?.();
          }
        });
      }
    };
  }, [enabled, modelUrl, preset, intensity]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden
    />
  );
}


