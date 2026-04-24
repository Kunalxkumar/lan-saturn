import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Yahan hum React app ko DOM mein mount kar rahe hain
// Networking Layer 7: React app browser mein load hoti hai aur SocketIO se connect karti hai
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);