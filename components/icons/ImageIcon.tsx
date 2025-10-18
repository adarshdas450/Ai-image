import React from 'react';

const ImageIcon: React.FC = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        className="gaming-image-icon"
    >
        <defs>
            <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-secondary)" />
            </linearGradient>
        </defs>
        
        {/* Glow layer */}
        <path 
            className="icon-glow"
            fill="url(#icon-gradient)"
            d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" 
        />
        
        {/* Main Frame */}
        <path 
            fill="var(--color-bg)" 
            d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z"
        />
        <path 
            stroke="url(#icon-gradient)" 
            strokeWidth="1.5"
            d="M20 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"
        />

        {/* Inner picture */}
        <path 
            stroke="url(#icon-gradient)" 
            strokeWidth="1.5"
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="m7.5 14.5 3-3 3 3 4-4"
        />
        <circle 
            cx="15.5" cy="8.5" r="1.5" 
            stroke="url(#icon-gradient)" 
            strokeWidth="1.5"
        />
    </svg>
);

export default ImageIcon;