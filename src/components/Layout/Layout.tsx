import React from 'react';

export default function Layout({ theme, children }) {
    return (
        <div className={`flex h-screen w-full bg-saturn-base text-gray-100 overflow-hidden font-sans ${theme}`}>
            {children}
        </div>
    );
}
