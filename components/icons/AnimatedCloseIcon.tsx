import React from 'react';

const AnimatedCloseIcon: React.FC = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-10 w-10"
        viewBox="0 0 24 24"
        style={{ cursor: 'pointer' }}
    >
        <style>{`
            .close-icon-wrapper:hover .close-icon-rotator {
                transform: rotate(90deg) scale(1.1);
            }
            .close-icon-wrapper:hover .close-icon-circle {
                stroke: #ff7777;
                fill: rgba(255, 85, 85, 0.5);
                filter: drop-shadow(0 0 4px #ff5555);
            }
            .close-icon-wrapper:hover .close-icon-cross {
                stroke: #ffffff;
            }

            .close-icon-rotator {
                transform-origin: center;
                transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
            }
            .close-icon-circle {
                fill: rgba(255, 85, 85, 0.2);
                stroke: #ff5555;
                stroke-width: 1.5;
                transition: all 0.3s ease;
            }
            .close-icon-cross {
                stroke: #ff9999;
                stroke-width: 2;
                stroke-linecap: round;
                transition: stroke 0.3s ease;
            }
        `}</style>
        <g className="close-icon-wrapper">
            <circle className="close-icon-circle" cx="12" cy="12" r="10" />
            <g className="close-icon-rotator">
                <path className="close-icon-cross" d="M8 8 l8 8 M16 8 l-8 8" />
            </g>
        </g>
    </svg>
);

export default AnimatedCloseIcon;
