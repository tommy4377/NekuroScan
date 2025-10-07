import React, { useEffect, useRef } from 'react';

// Background particellare minimale con WebGL API nativa
export default function ThreeBackground() {
  const containerRef = useRef(null);
  const rafRef = useRef(0);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const bufferRef = useRef(null);
  const colorBufferRef = useRef(null);
  const startRef = useRef(performance.now());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = 0;
    canvas.style.zIndex = 0;
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) return;
    glRef.current = gl;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    const vertSrc = `
      attribute vec2 aPos;
      attribute vec3 aCol;
      varying vec3 vCol;
      uniform float uTime;
      uniform vec2 uRes;
      void main() {
        vCol = aCol;
        vec2 p = aPos;
        p.y += 0.02 * sin(uTime * 0.5 + aPos.x * 10.0);
        gl_Position = vec4(p, 0.0, 1.0);
        gl_PointSize = 1.5 + 1.5 * abs(sin(uTime + aPos.x * 20.0));
      }
    `;
    const fragSrc = `
      precision mediump float;
      varying vec3 vCol;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        gl_FragColor = vec4(vCol, 0.6);
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
    programRef.current = prog;

    // Genera punti distribuiti su schermo
    const N = 1500;
    const positions = new Float32Array(N * 2);
    const colors = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      positions[i * 2] = x;
      positions[i * 2 + 1] = y;
      // viola pastello
      const base = [0.54, 0.37, 0.96];
      const jitter = (Math.random() - 0.5) * 0.1;
      colors[i * 3] = Math.min(1, Math.max(0, base[0] + jitter));
      colors[i * 3 + 1] = Math.min(1, Math.max(0, base[1] + jitter));
      colors[i * 3 + 2] = Math.min(1, Math.max(0, base[2] + jitter));
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    bufferRef.current = buf;

    const colBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    colorBufferRef.current = colBuf;

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
      gl.uniform1f(uTime, (t - startRef.current) * 0.001);
      gl.drawArrays(gl.POINTS, 0, N);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (container.contains(canvas)) container.removeChild(canvas);
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context');
        ext && ext.loseContext();
      }
    };
  }, []);

  return <div ref={containerRef} />;
}


