import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
    to: number;
    from?: number;
    duration?: number;
    separator?: string;
    decimals?: number;
    className?: string;
}

export default function CountUp({
    to,
    from = 0,
    duration = 0.8,
    separator = ',',
    decimals = 0,
    className = '',
}: CountUpProps) {
    const [count, setCount] = useState(from);
    const startTimeRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        startTimeRef.current = null;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = Math.min((timestamp - startTimeRef.current) / (duration * 1000), 1);
            
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = from + (to - from) * easeProgress;

            setCount(currentVal);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                setCount(to);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [to, from, duration]);

    const formatted = count.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).replace(/,/g, separator);

    return <span className={className}>{formatted}</span>;
}
