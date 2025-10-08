import React, { useEffect, useRef } from 'react';

// Background particellare minimale e discreto
export default function ThreeBackground() {
  const containerRef = useRef(null);
  const rafRef = useRef(0);
  const glRef = useRef(null);
  const startRef = useRef(performance.now());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      console.warn('ThreeBackground: Container not found');
      return;
    }

    console.log('✅ ThreeBackground: Initializing particle system...');
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.4';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false });
    if (!gl) {
      console.warn('ThreeBackground: WebGL not supported');
      return;
    }
    glRef.current = gl;
    console.log('✅ ThreeBackground: WebGL context created');

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    window.addEventListener('resize', resize);
    resize();

    const vertSrc = `
      attribute vec2 aPos;
      attribute vec3 aCol;
      varying vec3 vCol;
      uniform float uTime;
      void main() {
        vCol = aCol;
        vec2 p = aPos;
        p.y += 0.01 * sin(uTime * 0.3 + aPos.x * 8.0);
        gl_Position = vec4(p, 0.0, 1.0);
        gl_PointSize = 2.2;
      }
    `;
    const fragSrc = `
      precision lowp float;
      varying vec3 vCol;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        gl_FragColor = vec4(vCol, 0.9);
      }
    `;

    const compile = (src, type) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const vs = compile(vertSrc, gl.VERTEX_SHADER);
    const fs = compile(fragSrc, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Genera 1200 punti distribuiti (più particelle)
    const N = 1200;
    const positions = new Float32Array(N * 2);
    const colors = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      positions[i * 2] = Math.random() * 2 - 1;
      positions[i * 2 + 1] = Math.random() * 2 - 1;
      // Viola più vivace e variato
      const base = [0.6, 0.4, 0.95];
      const var1 = (Math.random() - 0.5) * 0.2;
      colors[i * 3] = Math.min(1, Math.max(0.3, base[0] + var1));
      colors[i * 3 + 1] = Math.min(1, Math.max(0.2, base[1] + var1));
      colors[i * 3 + 2] = Math.min(1, Math.max(0.7, base[2] + var1));
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const colBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const aCol = gl.getAttribLocation(prog, 'aCol');
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'uTime');

    const render = (t) => {
      rafRef.current = requestAnimationFrame(render);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, (t - startRef.current) * 0.0008);
      gl.drawArrays(gl.POINTS, 0, N);
    };
    rafRef.current = requestAnimationFrame(render);
    console.log('✅ ThreeBackground: Particle system started with', N, 'particles');

    return () => {
      console.log('✅ ThreeBackground: Cleaning up...');
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      if (container.contains(canvas)) container.removeChild(canvas);
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context');
        ext && ext.loseContext();
      }
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }} />;
}
