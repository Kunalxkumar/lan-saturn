import React, { useEffect, useState, useRef } from 'react';

interface DecryptedTextProps {
    text: string;
    speed?: number;
    maxIterations?: number;
    characters?: string;
    className?: string;
    parentClassName?: string;
    encryptedClassName?: string;
    animateOn?: 'view' | 'hover' | 'mount';
    sequential?: boolean;
}

export default function DecryptedText({
    text,
    speed = 35,
    maxIterations = 10,
    characters = '0123456789ABCDEF!@#$%^&*~<>{}[]',
    className = '',
    parentClassName = '',
    encryptedClassName = 'text-sky-400 font-mono opacity-80',
    animateOn = 'mount',
    sequential = true,
}: DecryptedTextProps) {
    const [displayText, setDisplayText] = useState(text);
    const [isScrambling, setIsScrambling] = useState(false);
    const intervalRef = useRef<any>(null);

    const scramble = () => {
        if (isScrambling) return;
        setIsScrambling(true);

        let iteration = 0;
        const targetText = text;

        clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setDisplayText(() => {
                return targetText
                    .split('')
                    .map((char, index) => {
                        if (char === ' ') return ' ';
                        if (sequential) {
                            if (index < iteration) {
                                return targetText[index];
                            }
                        } else {
                            if (iteration >= maxIterations) {
                                return targetText[index];
                            }
                        }
                        return characters[Math.floor(Math.random() * characters.length)];
                    })
                    .join('');
            });

            iteration += 1 / (targetText.length > 15 ? 2 : 1);

            if (iteration >= targetText.length + 1 || iteration > maxIterations * 2) {
                clearInterval(intervalRef.current);
                setDisplayText(targetText);
                setIsScrambling(false);
            }
        }, speed);
    };

    useEffect(() => {
        if (animateOn === 'mount') {
            scramble();
        }
        return () => clearInterval(intervalRef.current);
    }, [text]);

    return (
        <span
            className={`inline-block ${parentClassName}`}
            onMouseEnter={animateOn === 'hover' ? scramble : undefined}
        >
            <span className={isScrambling ? encryptedClassName : className}>
                {displayText}
            </span>
        </span>
    );
}
