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

      // Create new particle with reduced frequency
      if (Math.random() > 0.7) { // Only create particles 30% of the time for subtlety
        setParticleId(prev => prev + 1);
        setParticles(prev => [...prev, {
          id: particleId,
          x: e.clientX,
          y: e.clientY
        }].slice(-5)); // Keep only last 5 particles for a more subtle effect
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    // Keep default cursor visible
    document.body.style.cursor = 'auto';

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, [particleId]);

  return (
    <>
      {/* Subtle cursor highlight */}
      <motion.div
        className="fixed w-4 h-4 pointer-events-none z-50"
        animate={{ x: mousePosition.x - 8, y: mousePosition.y - 8 }}
        transition={{ type: "tween", duration: 0 }}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-sm" />
      </motion.div>

      {/* Mixed purple-cyan trail */}
      <AnimatePresence>
        {particles.map((particle, index) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: particle.x,
              y: particle.y,
              scale: 0.5,
              opacity: 0.3 
            }}
            animate={{ 
              scale: 0,
              opacity: 0 
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: "easeOut"
            }}
            className="fixed w-2 h-2 pointer-events-none z-40"
            style={{ 
              left: -4, 
              top: -4,
              background: index % 2 === 0 
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(34, 211, 238, 0.4))'
                : 'linear-gradient(135deg, rgba(34, 211, 238, 0.4), rgba(168, 85, 247, 0.4))'
            }}
          >
            <div className="w-full h-full rounded-full" />
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}