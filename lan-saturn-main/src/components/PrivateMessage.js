import React from 'react';

// PrivateMessage component - private messaging functionality
// Networking Layer 7: Direct user-to-user communication
function PrivateMessage({
    users,
    currentUsername,
    privateTarget,
    privateMessage,
    onTargetChange,
    onMessageChange,
    onSend
}) {
    // Filter out current user from private message targets
    const availableUsers = users.filter(user => user !== currentUsername);

    const handleSend = () => {
        if (privateTarget && privateMessage.trim()) {
            onSend();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="private-message-container">
            <select
                className="private-select"
                value={privateTarget}
                onChange={(e) => onTargetChange(e.target.value)}
            >
                <option value="">Public Message</option>
                {availableUsers.map((user, index) => (
                    <option key={index} value={user}>
                        Private to {user}
                    </option>
                ))}
            </select>

            <input
                type="text"
                className="private-input"
                placeholder="Private message..."
                value={privateMessage}
                onChange={(e) => onMessageChange(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!privateTarget}
            />

            <button
                className="private-send-btn"
                onClick={handleSend}
                disabled={!privateTarget || !privateMessage.trim()}
            >
                Send Private
            </button>
        </div>
    );
}

export default PrivateMessage;