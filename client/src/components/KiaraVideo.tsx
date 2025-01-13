import { useRef } from 'react';
import { Card } from "@/components/ui/card";

export default function KiaraVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <Card className="w-full h-full bg-transparent border-0 overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        src="https://files.catbox.moe/tq2h81.webm"
        autoPlay
        loop
        muted
        playsInline
      >
        Your browser does not support the video tag.
      </video>
    </Card>
  );
}