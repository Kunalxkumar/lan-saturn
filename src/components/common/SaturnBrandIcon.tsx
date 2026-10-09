import React from 'react';

interface SaturnBrandIconProps {
    size?: number;
    className?: string;
}

export default function SaturnBrandIcon({ size = 24, className = '' }: SaturnBrandIconProps) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 32 32" 
            width={size} 
            height={size}
            className={`shrink-0 ${className}`}
        >
            <defs>
                <radialGradient id="saturnBrandSphere" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="40%" stopColor="#0284c7" />
                    <stop offset="85%" stopColor="#0a0f1d" />
                    <stop offset="100%" stopColor="#04060a" />
                </radialGradient>
                <linearGradient id="saturnBrandRing" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                    <stop offset="30%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="70%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
                </linearGradient>
                <mask id="saturnBrandBackMask">
                    <rect x="0" y="0" width="32" height="32" fill="#fff" />
                    <circle cx="16" cy="16" r="7" fill="#000" />
                </mask>
                <clipPath id="saturnBrandFrontClip">
                    <polygon points="0,16 32,8 32,32 0,32" />
                </clipPath>
            </defs>

            <g transform="rotate(-23 16 16)">
                {/* Back Ring (Behind Planet) */}
                <ellipse 
                    cx="16" 
                    cy="16" 
                    rx="14" 
                    ry="4.2" 
                    fill="none" 
                    stroke="url(#saturnBrandRing)" 
                    strokeWidth="2.2" 
                    mask="url(#saturnBrandBackMask)" 
                />

                {/* Planet Sphere */}
                <circle cx="16" cy="16" r="7" fill="url(#saturnBrandSphere)" />
                <circle cx="16" cy="16" r="7" fill="none" stroke="#38bdf8" strokeWidth="0.75" strokeOpacity="0.5" />

                {/* Front Ring (In Front of Planet) */}
                <ellipse 
                    cx="16" 
                    cy="16" 
                    rx="14" 
                    ry="4.2" 
                    fill="none" 
                    stroke="url(#saturnBrandRing)" 
                    strokeWidth="2.2" 
                    clipPath="url(#saturnBrandFrontClip)" 
                />

                {/* Mesh Nodes */}
                <circle cx="16" cy="20.2" r="1.4" fill="#f59e0b" />
                <circle cx="16" cy="20.2" r="0.6" fill="#ffffff" />
                <circle cx="2" cy="16" r="1.1" fill="#38bdf8" />
                <circle cx="30" cy="16" r="1.1" fill="#38bdf8" />
            </g>
        </svg>
    );
}
