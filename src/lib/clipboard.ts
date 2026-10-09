/**
 * Lean native Clipboard helper using the standard Web Clipboard API.
 */

export async function readClipboardText(): Promise<string> {
    try {
        if (navigator.clipboard?.readText) {
            return await navigator.clipboard.readText();
        }
    } catch (err) {
        console.warn('Clipboard read unavailable:', err);
    }
    return '';
}

export async function writeClipboardText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (err) {
        console.error('Clipboard write failed:', err);
    }
    return false;
}

export function watchClipboard(onChanged: (text: string) => void) {
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
