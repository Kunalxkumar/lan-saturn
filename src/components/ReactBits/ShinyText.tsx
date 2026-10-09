import React from 'react';

interface ShinyTextProps {
    text: string;
    disabled?: boolean;
    speed?: number;
    className?: string;
}

export default function ShinyText({
    text,
    disabled = false,
    speed = 5,
    className = '',
}: ShinyTextProps) {
    if (disabled) {
        return <span className={className}>{text}</span>;
    }

    return (
        <span
            className={`inline-block shiny-text ${className}`}
            style={{ animationDuration: `${speed}s` }}
        >
            {text}
        </span>
    );
}
