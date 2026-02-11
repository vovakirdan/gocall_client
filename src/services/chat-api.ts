import { headers } from "./api";
import { API_BASE_URL } from "./config";
import { IChatMessageResponse } from "../types";

export async function fetchChatHistory(token: string): Promise<IChatMessageResponse[]> {
    // Legacy endpoint is not available on current backend.
    // Keep function for compatibility with older UI paths.
    void API_BASE_URL;
    void headers(token);
    return [];
}
