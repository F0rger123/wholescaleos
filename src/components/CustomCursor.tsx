import React, { useEffect, useState, useRef } from 'react';

export function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
      
      // Check if hovering over interactive elements
      const target = e.target as HTMLElement;
      const isInteractive = target?.closest('button, a, input, [role="button"], .cursor-pointer');
      setIsHovering(!!isInteractive);
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('mouseenter', onMouseEnter);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('mouseenter', onMouseEnter);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Outer Glow / Halo */}
      <div
        ref={glowRef}
        className="fixed pointer-events-none z-[99999] transition-transform duration-300 ease-out"
        style={{
          left: position.x,
          top: position.y,
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, var(--t-primary) 0%, transparent 70%)',
          opacity: isHovering ? 0.15 : 0.08,
          transform: `translate(-50%, -50%) scale(${isHovering ? 1.5 : 1})`,
          filter: 'blur(20px)',
        }}
      />

      {/* Main Cursor Dot */}
      <div
        ref={cursorRef}
        className="fixed pointer-events-none z-[99999] mix-blend-difference"
        style={{
          left: position.x,
          top: position.y,
          width: isHovering ? '40px' : '8px',
          height: isHovering ? '40px' : '8px',
          backgroundColor: 'white',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.2s, height 0.2s, background-color 0.2s',
          opacity: 0.8,
        }}
      />
    </>
  );
}
