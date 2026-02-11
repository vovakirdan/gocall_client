const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "");

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const envWsUrl = import.meta.env.VITE_WS_URL?.trim();

// Defaults keep local desktop/dev behavior unchanged.
export const API_BASE_URL = trimTrailingSlashes(
  envApiBaseUrl && envApiBaseUrl.length > 0
    ? envApiBaseUrl
    : "http://localhost:8080/api"
);

export const WS_BASE_URL = trimTrailingSlashes(
  envWsUrl && envWsUrl.length > 0 ? envWsUrl : "ws://localhost:8080/ws"
);
