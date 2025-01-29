import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
}

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resizeCanvas() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const stars: Star[] = [];
    const numStars = 200; // Reduced number of stars

    // Initialize stars with smaller sizes
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 0.5 + 0.2, // Smaller size range: 0.2 to 0.7
        alpha: Math.random() * 0.3 + 0.1, // More subtle alpha range: 0.1 to 0.4
        speed: Math.random() * 0.005 + 0.002 // Slower speed for more subtle effect
      });
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function animate() {
      if (!canvas || !ctx) return;

      // Use a more transparent black for the fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        star.alpha += star.speed;
        if (star.alpha > 0.4) star.alpha = 0.1; // Reset at lower max alpha

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none opacity-70"
    />
  );
}