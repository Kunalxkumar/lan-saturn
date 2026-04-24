import React from 'react';

// UserList component - online users ki list display karta hai
// Networking Layer 7: Real-time user presence tracking
function UserList({ users, currentUsername }) {
    return (
        <div className="user-list">
            <h3>Online Users ({users.length})</h3>
            {users.length === 0 ? (
                <div className="user-item">No users online</div>
            ) : (
                users.map((user, index) => (
                    <div key={index} className="user-item">
                        <span className="online-status"></span>
                        {user}
                        {user === currentUsername && <span style={{ marginLeft: '5px', fontSize: '0.8em' }}>(You)</span>}
                    </div>
                ))
            )}
        </div>
    );
}

export default UserList;