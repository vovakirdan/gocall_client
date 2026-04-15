import { IChatMessageResponse } from "../types";
import { API_BASE_URL, WS_BASE_URL } from "./config";
import { headers } from "./api";

// fetchDirectChatHistory returns the ordered direct-message history with another user.
export async function fetchDirectChatHistory(
  token: string,
  withUserID: string
): Promise<IChatMessageResponse[]> {
  const query = new URLSearchParams({
    with_user: withUserID,
  });

  const response = await fetch(`${API_BASE_URL}/chat/history?${query.toString()}`, {
    method: "GET",
    headers: headers(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch chat history");
  }

  const payload = (await response.json()) as { messages?: unknown };
  return Array.isArray(payload.messages)
    ? (payload.messages as IChatMessageResponse[])
    : [];
}

// DirectChatSocketHandlers contains callbacks for direct chat websocket lifecycle events.
export interface DirectChatSocketHandlers {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
  onMessage?: (message: { from: string; to: string; message: string }) => void;
}

// connectDirectChatSocket opens a direct chat websocket and wires the provided callbacks.
export function connectDirectChatSocket(
  token: string,
  handlers: DirectChatSocketHandlers
): WebSocket {
  const ws = new WebSocket(`${WS_BASE_URL}?token=${encodeURIComponent(token)}`);

  ws.addEventListener("open", () => handlers.onOpen?.());
  ws.addEventListener("close", () => handlers.onClose?.());
  ws.addEventListener("error", () => handlers.onError?.());
  ws.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data) as {
        from?: string;
        to?: string;
        message?: string;
      };

      if (
        typeof payload.from !== "string" ||
        typeof payload.to !== "string" ||
        typeof payload.message !== "string"
      ) {
        return;
      }

      handlers.onMessage?.({
        from: payload.from,
        to: payload.to,
        message: payload.message,
      });
    } catch {
      // Ignore malformed frames from unrelated protocols.
    }
  });

  return ws;
}
