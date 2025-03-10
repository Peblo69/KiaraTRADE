import { SVGProps } from 'react';

export function TelegramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="14" 
      height="12" 
      viewBox="0 0 12 12" 
      fill="none" 
      {...props}
    >
      <g clipPath="url(#clip0_12893_33676)">
        <mask id="mask0_12893_33676" maskUnits="userSpaceOnUse" x="0" y="0" width="12" height="12" style={{ maskType: 'luminance' }}>
          <path d="M12 0H0V12H12V0Z" fill="white" />
        </mask>
        <g mask="url(#mask0_12893_33676)">
          <path d="M11.8939 1.90992L10.0939 10.3969C9.9599 10.9969 9.6039 11.1429 9.1019 10.8619L6.3599 8.84192L5.0379 10.1149C4.8909 10.2619 4.7679 10.3849 4.4869 10.3849L4.6829 7.59192L9.7639 2.99992C9.9839 2.80392 9.7139 2.69292 9.4199 2.88992L3.1379 6.84392L0.429897 5.99992C-0.158103 5.81692 -0.170103 5.41192 0.551897 5.13092L11.1339 1.05292C11.6239 0.869924 12.0519 1.16292 11.8939 1.90992Z" fill="currentColor" />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_12893_33676">
          <rect width="12" height="12" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}