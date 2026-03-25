import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

export const CursorEffects: React.FC = () => {
  const { cursorSettings } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const particles = useRef<any[]>([]);
  const requestRef = useRef<number>(null);

  useEffect(() => {
    if (!cursorSettings.enabled || cursorSettings.type === 'none') {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      if (cursorSettings.type === 'sparkles') {
        // Add new particles on move
        for (let i = 0; i < 2; i++) {
          particles.current.push({
            x: e.clientX,
            y: e.clientY,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 3 + 1,
            life: 1.0,
            color: cursorSettings.color.startsWith('var') ? getComputedStyle(document.documentElement).getPropertyValue(cursorSettings.color.replace('var(', '').replace(')', '')) : cursorSettings.color
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      if (cursorSettings.type === 'sparkles' && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          particles.current = particles.current.filter(p => p.life > 0);
          
          particles.current.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color || '#fff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [cursorSettings.enabled, cursorSettings.type, cursorSettings.color]);

  if (!cursorSettings.enabled || cursorSettings.type === 'none') return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]" style={{ mixBlendMode: 'screen' }}>
      {/* Glow Effect */}
      {cursorSettings.type === 'glow' && (
        <div 
          className="absolute rounded-full blur-[60px] transition-transform duration-100 ease-out"
          style={{
            width: cursorSettings.size * 2,
            height: cursorSettings.size * 2,
            left: mousePos.x - cursorSettings.size,
            top: mousePos.y - cursorSettings.size,
            background: `radial-gradient(circle, ${cursorSettings.color} 0%, transparent 70%)`,
            opacity: cursorSettings.intensity / 100,
          }}
        />
      )}

      {/* Spotlight Effect */}
      {cursorSettings.type === 'spotlight' && (
        <div 
          className="absolute inset-0 bg-black"
          style={{
            opacity: 0.9,
            maskImage: `radial-gradient(circle ${cursorSettings.size}px at ${mousePos.x}px ${mousePos.y}px, transparent, black 100%)`,
            WebkitMaskImage: `radial-gradient(circle ${cursorSettings.size}px at ${mousePos.x}px ${mousePos.y}px, transparent, black 100%)`,
          }}
        />
      )}

      {/* Trail Effect */}
      {cursorSettings.type === 'trail' && (
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i}
              className="absolute rounded-full pointer-events-none transition-all duration-300 ease-out"
              style={{
                width: cursorSettings.size / (i + 1),
                height: cursorSettings.size / (i + 1),
                left: mousePos.x,
                top: mousePos.y,
                backgroundColor: cursorSettings.color,
                opacity: (cursorSettings.intensity / 100) * (1 - i / 8),
                transform: `translate(-50%, -50%)`,
                transitionDelay: `${i * 20}ms`
              }}
            />
          ))}
        </div>
      )}

      {/* Sparkles Effect (Canvas) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: cursorSettings.type === 'sparkles' ? 'block' : 'none' }}
      />
    </div>
  );
};
