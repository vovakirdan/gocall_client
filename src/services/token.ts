import CryptoJS from "crypto-js";
import { readTextFile, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";

const TOKEN_FILE = "token.json";
const ENCRYPTION_KEY = "my_secret_key"; // todo use key

function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
}

function decrypt(encryptedData: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// reading token from source
export async function getToken(): Promise<string | null> {
  try {
    const encryptedToken = await readTextFile(TOKEN_FILE, { baseDir: BaseDirectory.AppData });
    return decrypt(encryptedToken);
  } catch (error) {
    console.warn("No token found or error reading token", error);
    return null;
  }
}

// save file token
export async function saveToken(token: string): Promise<void> {
  try {
    const encryptedToken = encrypt(token);
    await writeTextFile(TOKEN_FILE, encryptedToken, { baseDir: BaseDirectory.AppData });
  } catch (error) {
    console.error("Failed to save token", error);
    throw error;
  }
}

// remove token or rewrite
export async function removeToken(): Promise<void> {
  try {
    await writeTextFile(TOKEN_FILE, "", { baseDir: BaseDirectory.AppData });
  } catch (error) {
    console.error("Failed to remove token", error);
    throw error;
  }
}
