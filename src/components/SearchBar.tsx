import React from 'react';

// SearchBar component - message search functionality
// Networking Layer 7: Search messages on the client
function SearchBar({ value, onChange }) {
    return (
        <div className="search-container">
            <input
                type="text"
                className="search-input"
                placeholder="Search messages..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

export default SearchBar;
