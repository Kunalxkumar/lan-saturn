/**
 * Helper bridge for Tauri IPC clipboard operations.
 * Gracefully falls back to browser Clipboard API if not running inside Tauri.
 */

export const isTauri = () => {
    return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
};

export async function readClipboardText() {
    if (isTauri()) {
        try {
            const { invoke } = window.__TAURI__.core;
            return await invoke('get_clipboard_text');
        } catch (err) {
            console.error('Tauri clipboard read failed:', err);
            return '';
        }
    } else {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                return await navigator.clipboard.readText();
            }
        } catch (err) {
            console.warn('Browser clipboard read blocked/not allowed:', err);
        }
        return '';
    }
}

export async function writeClipboardText(text) {
    if (isTauri()) {
        try {
            const { invoke } = window.__TAURI__.core;
            await invoke('set_clipboard_text', { text });
            return true;
        } catch (err) {
            console.error('Tauri clipboard write failed:', err);
            return false;
        }
    } else {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            console.error('Browser clipboard write failed:', err);
        }
        return false;
    }
}

export function watchClipboard(onChanged) {
    if (isTauri()) {
        try {
            const { invoke } = window.__TAURI__.core;
            const { listen } = window.__TAURI__.event;
            
            // Start Rust watcher polling loop
            invoke('start_clipboard_watch').catch(err => {
                console.error('Failed to start Tauri clipboard watcher:', err);
            });

            // Listen to events from Rust
            const unlistenPromise = listen('clipboard-changed', (event) => {
                onChanged(event.payload);
            });

            return () => {
                unlistenPromise.then(unlisten => unlisten());
            };
        } catch (err) {
            console.error('Failed to set up Tauri clipboard listeners:', err);
        }
    }
    
    // Fallback: browser polling (only works if tab is focused)
    let lastText = '';
    const interval = setInterval(async () => {
        if (document.hasFocus()) {
            const text = await readClipboardText();
            if (text && text !== lastText) {
                lastText = text;
                onChanged(text);
            }
        }
    }, 1000);

    return () => clearInterval(interval);
}
