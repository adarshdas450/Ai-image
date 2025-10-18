import React from 'react';

const CreditIcon: React.FC = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24"
        className="h-6 w-6 credit-icon"
    >
        <defs>
            <linearGradient id="credit-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-secondary)" />
            </linearGradient>
        </defs>
        <g fill="none" stroke="url(#credit-grad)" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M12 2.5l-6.5 4v9l6.5 4l6.5-4v-9z" />
            <path d="M5.5 6.5l6.5 4l6.5-4" />
            <path d="M12 20.5v-10" />
        </g>
    </svg>
);

export default CreditIcon;
