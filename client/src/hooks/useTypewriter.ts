import { useState, useEffect } from 'react';

interface TypewriterOptions {
  text: string;
  typingSpeed?: number; // milliseconds per chunk
  onComplete?: () => void;
}

export function useTypewriter({ text, typingSpeed = 30, onComplete }: TypewriterOptions) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const textLength = text.length;
    // Calculate chunk size to complete within ~2 seconds
    const chunkSize = Math.max(Math.ceil(textLength / (2000 / typingSpeed)), 4);
    let currentIndex = 0;

    const typeChunk = () => {
      if (currentIndex < textLength) {
        const nextIndex = Math.min(currentIndex + chunkSize, textLength);
        setDisplayText(text.slice(0, nextIndex));
        currentIndex = nextIndex;
        timeoutId = setTimeout(typeChunk, typingSpeed);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    typeChunk();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [text, typingSpeed, onComplete]);

  return { displayText, isComplete };
}
