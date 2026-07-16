import React from 'react';

export default function SystemMessage({ content }) {
    return (
        <div className="system-message">
            <div className="system-line" />
            <span className="system-text">{content}</span>
            <div className="system-line" />
        </div>
    );
}
