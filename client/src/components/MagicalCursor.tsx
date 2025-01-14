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
      setParticleId(prev => prev + 1);
      setParticles(prev => [...prev, {
        id: particleId,
        x: e.clientX,
        y: e.clientY
      }].slice(-15)); // Keep more particles for a more visible trail
    };

    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, [particleId]);

  return (
    <>
      {/* Neon cursor highlight */}
      <motion.div
        className="fixed pointer-events-none z-50"
        animate={{ x: mousePosition.x - 8, y: mousePosition.y - 8 }}
        transition={{ type: "tween", duration: 0 }}
      >
        <div 
          className="w-4 h-4"
          style={{
            boxShadow: `
              0 0 5px rgba(168, 85, 247, 0.5),
              0 0 10px rgba(34, 211, 238, 0.5),
              0 0 15px rgba(168, 85, 247, 0.3)
            `,
            clipPath: 'polygon(0% 0%, 60% 60%, 100% 100%, 60% 100%, 60% 60%, 0% 100%)', // Custom cursor shape
            transform: 'rotate(-45deg)',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.8), rgba(34, 211, 238, 0.8))'
          }}
        />
      </motion.div>

      {/* Mixed purple-cyan trail */}
      <AnimatePresence>
        {particles.map((particle, index) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: particle.x - 4,
              y: particle.y - 4,
              scale: 1,
              opacity: 0.8
            }}
            animate={{ 
              scale: 0,
              opacity: 0
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: "easeOut"
            }}
            style={{ 
              position: 'fixed',
              width: '8px',
              height: '8px',
              pointerEvents: 'none',
              zIndex: 40,
              background: index % 2 === 0 
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.6), rgba(34, 211, 238, 0.2))'
                : 'linear-gradient(135deg, rgba(34, 211, 238, 0.6), rgba(168, 85, 247, 0.2))',
              boxShadow: index % 2 === 0
                ? '0 0 8px rgba(168, 85, 247, 0.4)'
                : '0 0 8px rgba(34, 211, 238, 0.4)',
              borderRadius: '2px',
              transform: 'rotate(45deg)'
            }}
          />
        ))}
      </AnimatePresence>
    </>
  );
}