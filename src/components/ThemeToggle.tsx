import React from 'react';

function ThemeToggle({ theme, onToggle }) {
    return (
        <button
            className="theme-toggle"
            onClick={onToggle}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
    );
}

export default ThemeToggle;
