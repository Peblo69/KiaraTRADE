import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Position {
  x: number;
  y: number;
}

interface Particle extends Position {
  id: number;
}

export default function MagicalCursor() {
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [particleId, setParticleId] = useState(0);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Create new particle
      if (Math.random() > 0.5) { // Only create particles 50% of the time for performance
        setParticleId(prev => prev + 1);
        setParticles(prev => [...prev, {
          id: particleId,
          x: e.clientX,
          y: e.clientY
        }].slice(-10)); // Keep only last 10 particles
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    document.body.style.cursor = 'none'; // Hide default cursor

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      document.body.style.cursor = 'auto'; // Restore default cursor
    };
  }, [particleId]);

  return (
    <>
      {/* Main cursor */}
      <motion.div
        className="fixed w-6 h-6 pointer-events-none z-50"
        animate={{ x: mousePosition.x - 12, y: mousePosition.y - 12 }}
        transition={{ type: "tween", duration: 0 }}
      >
        <div className="w-full h-full rounded-full bg-purple-500/30 backdrop-blur-sm border border-purple-400/50" />
      </motion.div>

      {/* Cursor trail */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: particle.x,
              y: particle.y,
              scale: 1,
              opacity: 0.5 
            }}
            animate={{ 
              scale: 0,
              opacity: 0 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed w-2 h-2 pointer-events-none z-40"
            style={{ left: -4, top: -4 }}
          >
            <div className="w-full h-full rounded-full bg-purple-400/40" />
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}
