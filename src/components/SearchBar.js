import React, { useRef } from 'react';

// SearchBar component - message search aur file upload functionality
// Networking Layer 7: File sharing aur search capabilities
function SearchBar({ value, onChange, onFileUpload }) {
    const fileInputRef = useRef(null);

    const handleFileButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileUpload(file);
            // Reset file input
            e.target.value = '';
        }
    };

    return (
        <div className="search-container">
            <input
                type="text"
                className="search-input"
                placeholder="Search messages..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />

            <input
                ref={fileInputRef}
                type="file"
                className="file-input"
                onChange={handleFileChange}
                accept="*/*"
            />

            <button
                className="file-button"
                onClick={handleFileButtonClick}
                title="Share File"
            >
                📎 Share File
            </button>
        </div>
    );
}

export default SearchBar;