import { API_BASE_URL, headers } from "./api";
import { IChatMessageResponse } from "../types";

export async function fetchChatHistory(token: string): Promise<IChatMessageResponse[]> {
    const response = await fetch(`${API_BASE_URL}/chat/history?with_user=` + token, {
        method: "GET",
        headers: headers(token),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch chat history");
      }
      const data = await response.json();
      return data.messages;
}