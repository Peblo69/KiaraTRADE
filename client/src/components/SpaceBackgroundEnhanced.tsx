import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  brightness: number;
}

interface FallingStar {
  id: number;
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

export default function SpaceBackgroundEnhanced() {
  const [stars, setStars] = useState<Star[]>([]);
  const [fallingStars, setFallingStars] = useState<FallingStar[]>([]);
  const [fallingStarId, setFallingStarId] = useState(0);

  // Generate initial stars
  useEffect(() => {
    const numberOfStars = 200;
    const generatedStars: Star[] = [];

    for (let i = 0; i < numberOfStars; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100, // percentage
        y: Math.random() * 100, // percentage
        size: Math.random() * 3 + 1, // 1-4px
        brightness: Math.random() * 0.7 + 0.3, // 0.3-1.0
      });
    }

    setStars(generatedStars);
  }, []);

  // Falling star animation
  useEffect(() => {
    const interval = setInterval(() => {
      const startX = Math.random() * 100;
      const startY = -5; // Start above viewport
      const endX = startX + Math.random() * 30 + 10; // Move 10-40% right
      const endY = Math.random() * 40 + 30; // End 30-70% down

      setFallingStarId(prev => prev + 1);
      setFallingStars(prev => [...prev, {
        id: fallingStarId,
        startX,
        endX,
        startY,
        endY
      }]);

      // Remove falling star after animation
      setTimeout(() => {
        setFallingStars(prev => prev.filter(star => star.id !== fallingStarId));
      }, 1000);
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [fallingStarId]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Static stars */}
      {stars.map(star => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.brightness,
          }}
          animate={{
            opacity: [star.brightness, star.brightness * 0.5, star.brightness],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}

      {/* Falling stars */}
      <AnimatePresence>
        {fallingStars.map(star => (
          <motion.div
            key={star.id}
            className="absolute h-px w-20 bg-gradient-to-r from-transparent via-white to-transparent"
            initial={{
              left: `${star.startX}%`,
              top: `${star.startY}%`,
              opacity: 0,
              rotate: 45
            }}
            animate={{
              left: `${star.endX}%`,
              top: `${star.endY}%`,
              opacity: [0, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1,
              ease: "easeOut"
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
