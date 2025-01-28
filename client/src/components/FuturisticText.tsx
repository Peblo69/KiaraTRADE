import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FuturisticTextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span';
  glitch?: boolean;
  gradient?: boolean;
  glow?: boolean;
  reveal?: boolean;
  parallax?: boolean;
  children: React.ReactNode;
}

export const FuturisticText: React.FC<FuturisticTextProps> = ({
  variant = 'p',
  glitch,
  gradient,
  glow,
  reveal,
  parallax,
  children,
  className,
  ...props
}) => {
  const Component = variant as keyof JSX.IntrinsicElements;

  const baseClass = cn(
    className,
    {
      'glitch-text': glitch,
      'gradient-text': gradient,
      'glow-text': glow,
    }
  );

  const content = (
    <Component
      className={baseClass}
      {...props}
    >
      {children}
    </Component>
  );

  if (reveal || parallax) {
    return (
      <motion.div
        initial={{ opacity: 0, y: parallax ? 20 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.5,
          delay: 0.2
        }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};
