import React, { useEffect, useRef } from 'react';

// Background particellare compatibile con tutti i browser
export default function ThreeBackground() {
  const containerRef = useRef(null);
  const rafRef = useRef(0);
  const particlesRef = useRef([]);
  const startRef = useRef(performance.now());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      console.warn('ThreeBackground: Container not found');
      return;
    }

    console.log('✅ ThreeBackground: Initializing CSS-based particle system...');
    
    // Crea il canvas per il fallback
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-999';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.3';
    canvas.style.background = 'transparent';
    canvas.id = 'particle-background';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('ThreeBackground: Canvas 2D not supported');
      return;
    }

    // Genera particelle
    const particleCount = 100;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        color: `hsl(${240 + Math.random() * 40}, 60%, ${50 + Math.random() * 20}%)`
      });
    }
    
    particlesRef.current = particles;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    const render = (t) => {
      rafRef.current = requestAnimationFrame(render);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const time = (t - startRef.current) * 0.001;
      
      particles.forEach((particle, i) => {
        // Aggiorna posizione
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Effetto onde molto leggero
        particle.y += Math.sin(time * 0.2 + i * 0.1) * 0.1;
        particle.x += Math.cos(time * 0.1 + i * 0.05) * 0.1;
        
        // Wrap around
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Disegna particella
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        
        // Aggiungi glow leggero
        ctx.shadowBlur = 5;
        ctx.shadowColor = particle.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      
      
      ctx.globalAlpha = 1;
    };
    
    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: -999, 
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'transparent'
      }} 
    />
  );
}
