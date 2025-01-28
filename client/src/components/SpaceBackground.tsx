import React, { useEffect, useRef } from 'react';

export function SpaceBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create warp speed stars
    const createWarpStars = () => {
      const starsCount = 200;
      for (let i = 0; i < starsCount; i++) {
        const star = document.createElement('div');
        star.className = 'warp-star';

        // Random position
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;

        // Random animation delay
        star.style.animationDelay = `${Math.random() * 2}s`;

        // Random size variation
        const size = 1 + Math.random() * 2;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        // Random z-index starting position
        star.style.transform = `translateZ(${-1000 + Math.random() * 2000}px)`;

        container.appendChild(star);
      }
    };

    createWarpStars();

    // Recreate stars periodically to ensure smooth animation
    const interval = setInterval(() => {
      container.innerHTML = '';
      createWarpStars();
    }, 4000);

    return () => {
      clearInterval(interval);
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className="space-background" />;
}

export default SpaceBackground;