declare global {
    interface Window {
        __TAURI_INTERNALS__?: Record<string, unknown>;
    }
}

export const isDesktop = (): boolean => {
    return typeof window.__TAURI_INTERNALS__ !== "undefined"
};