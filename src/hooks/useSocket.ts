import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

/**
 * Custom hook for managing the Socket.IO connection.
 * Handles connect/disconnect, user list, and exposes the socket ref.
 */
export default function useSocket(initialChannel, initialUsername) {
    const socketRef = useRef(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [users, setUsers] = useState([]);

    useEffect(() => {
        socketRef.current = io({
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            timeout: 20000
        });
        const socket = socketRef.current;

        socket.on('connect', () => {
            setConnectionStatus('connected');
            socket.emit('join_channel', {
                channel: initialChannel,
                username: initialUsername
            });
        });

        socket.on('disconnect', () => {
            setConnectionStatus('disconnected');
        });

        socket.on('connect_error', () => {
            setConnectionStatus('connection error');
        });

        socket.on('user_list', (data) => {
            setUsers(data.users);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return { socketRef, connectionStatus, users };
}
