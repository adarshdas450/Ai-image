import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="relative w-32 h-32 gaming-loader">
      <svg
        className="absolute inset-0"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-secondary)" />
          </linearGradient>
          <filter id="spinner-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Rings */}
        <g className="ring-1" style={{ transformOrigin: '50% 50%' }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="url(#spinner-gradient)" strokeWidth="2" strokeDasharray="200 83" strokeLinecap="round" filter="url(#spinner-glow)" />
        </g>
        <g className="ring-2" style={{ transformOrigin: '50% 50%' }}>
          <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="5 10" />
        </g>
        <g className="ring-3" style={{ transformOrigin: '50% 50%' }}>
           <circle cx="50" cy="50" r="25" fill="none" stroke="var(--color-secondary)" strokeOpacity="0.5" strokeWidth="0.5" strokeDasharray="1 5" />
        </g>
        
        {/* Core */}
        <g className="core" style={{ transformOrigin: '50% 50%' }}>
          <polygon
            points="50,30 65,40 65,60 50,70 35,60 35,40"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
};

export default Spinner;