const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "");

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const envWsUrl = import.meta.env.VITE_WS_URL?.trim();

const getDefaultApiBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:8080/api";
  }

  const { origin, port, protocol, hostname } = window.location;
  if (port === "1420") {
    return "http://localhost:8080/api";
  }

  if (protocol === "tauri:" || protocol === "file:") {
    return "http://localhost:8080/api";
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:8080/api";
  }

  return `${origin}/api`;
};

const getDefaultWsBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return "ws://localhost:8080/api/chat/ws";
  }

  const { host, port, protocol, hostname } = window.location;
  if (port === "1420") {
    return "ws://localhost:8080/api/chat/ws";
  }

  if (protocol === "tauri:" || protocol === "file:") {
    return "ws://localhost:8080/api/chat/ws";
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "ws://localhost:8080/api/chat/ws";
  }

  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${host}/api/chat/ws`;
};

// API_BASE_URL is the resolved base URL for HTTP API requests.
export const API_BASE_URL = trimTrailingSlashes(
  envApiBaseUrl && envApiBaseUrl.length > 0
    ? envApiBaseUrl
    : getDefaultApiBaseUrl()
);

// WS_BASE_URL is the resolved base URL for chat websocket connections.
export const WS_BASE_URL = trimTrailingSlashes(
  envWsUrl && envWsUrl.length > 0 ? envWsUrl : getDefaultWsBaseUrl()
);
