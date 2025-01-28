import React from 'react';

export function PillIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 3C7.5 3 4 6.5 4 11V13C4 17.5 7.5 21 12 21C16.5 21 20 17.5 20 13V11C20 6.5 16.5 3 12 3Z"
        fill="#10B981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3V21"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 3C14.5 3 16.5 6.5 16.5 11V13C16.5 17.5 14.5 21 12 21"
        fill="white"
        fillOpacity="0.3"
      />
    </svg>
  );
}