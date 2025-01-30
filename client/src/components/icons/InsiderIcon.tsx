
import { SVGProps } from 'react';

export function InsiderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      width="12" 
      height="12" 
      viewBox="0 0 12 12" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path 
        d="M6 0C2.68629 0 0 2.68629 0 6C0 9.31371 2.68629 12 6 12C9.31371 12 12 9.31371 12 6C12 2.68629 9.31371 0 6 0ZM6 1.2C8.65097 1.2 10.8 3.34903 10.8 6C10.8 8.65097 8.65097 10.8 6 10.8C3.34903 10.8 1.2 8.65097 1.2 6C1.2 3.34903 3.34903 1.2 6 1.2ZM6 2.4C4.23269 2.4 2.8 3.83269 2.8 5.6C2.8 7.36731 4.23269 8.8 6 8.8C7.76731 8.8 9.2 7.36731 9.2 5.6C9.2 3.83269 7.76731 2.4 6 2.4Z" 
        fill="currentColor"
      />
    </svg>
  );
}
