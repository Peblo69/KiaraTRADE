import React, { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

export function KiaraVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [location] = useLocation();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Play video on mount
    video.play().catch(error => {
      console.log('Video autoplay failed:', error);
    });

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else {
        video.play().catch(console.log);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Don't show video on certain routes
  if (location.startsWith('/trading') || location.startsWith('/wallet')) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover opacity-30"
        loop
        muted
        playsInline
      >
        <source src="/videos/kiara-background.mp4" type="video/mp4" />
      </video>
    </div>
  );
}