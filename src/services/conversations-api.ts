import { ConversationInfo } from "../types";
import { headers } from "./api";
import { API_BASE_URL } from "./config";

// fetchConversations returns the user's existing direct-message conversation previews.
export async function fetchConversations(token: string): Promise<ConversationInfo[]> {
  const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: "GET",
    headers: headers(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch conversations");
  }

  const payload = (await response.json()) as { conversations?: ConversationInfo[] };
  return payload.conversations ?? [];
}
