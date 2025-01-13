import { useRef, useEffect } from 'react';

export default function ColorTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    video.addEventListener('loadeddata', () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get color from top-left corner (usually background)
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      console.log('Background Color:', `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`);
      console.log('Background Color (HEX):', `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`);
    });
  }, []);

  return (
    <div className="hidden">
      <video
        ref={videoRef}
        src="https://files.catbox.moe/tq2h81.webm"
        crossOrigin="anonymous"
      />
      <canvas ref={canvasRef} width="100" height="100" />
    </div>
  );
}
