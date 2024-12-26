import { invoke } from "@tauri-apps/api/core";

export async function getToken(): Promise<string | null> {
  try {
    const token = await invoke<string>("get_token");
    return token;
  } catch (error) {
    console.warn("No token found or error reading token", error);
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  try {
    await invoke("save_token", { token: token });
  } catch (error) {
    console.error("Failed to save token", error);
    throw error;
  }
}

export async function removeToken(): Promise<void> {
  try {
    await invoke("remove_token");
  } catch (error) {
    console.error("Failed to remove token", error);
    throw error;
  }
}
