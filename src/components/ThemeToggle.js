import React from 'react';

// ThemeToggle component - dark/light mode toggle
// Networking Layer 7: User interface customization
function ThemeToggle({ theme, onToggle }) {
    return (
        <button
            className="theme-toggle"
            onClick={onToggle}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
            {theme === 'dark' ? '🌙' : '☀️'}
        </button>
    );
}

export default ThemeToggle;