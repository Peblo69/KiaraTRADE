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
        
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 20}s`;
        
        const size = 1 + Math.random() * 2;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        star.style.transform = `translateZ(${-1000 + Math.random() * 2000}px)`;
        
        container.appendChild(star);
      }
    };

    // Create falling stars
    const createFallingStars = () => {
      const star = document.createElement('div');
      star.className = 'falling-star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = '-5px';
      container.appendChild(star);

      setTimeout(() => {
        if (container.contains(star)) {
          container.removeChild(star);
        }
      }, 3000);
    };

    // Create alien ships
    const createAlienShip = () => {
      const ship = document.createElement('div');
      ship.className = 'alien-ship';
      
      // Random path selection
      const paths = ['path1', 'path2', 'path3', 'path4'];
      ship.classList.add(paths[Math.floor(Math.random() * paths.length)]);
      
      container.appendChild(ship);

      setTimeout(() => {
        if (container.contains(ship)) {
          container.removeChild(ship);
        }
      }, 4000);
    };

    // Initialize stars
    createWarpStars();

    // Set up intervals for continuous effects
    const warpInterval = setInterval(() => {
      container.innerHTML = '';
      createWarpStars();
    }, 20000); // Extended to 20 seconds

    const fallingStarInterval = setInterval(createFallingStars, 2000);
    const alienShipInterval = setInterval(createAlienShip, 5000);

    return () => {
      clearInterval(warpInterval);
      clearInterval(fallingStarInterval);
      clearInterval(alienShipInterval);
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className="space-background" />;
}