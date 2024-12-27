import { isDesktop } from "../utils/platform";
import * as TauriTokenService from "../services/token-tauri";
import * as BrowserTokenService from "../services/token-browser";

export async function getToken(): Promise<string | null> {
  return isDesktop()
    ? TauriTokenService.getToken()
    : BrowserTokenService.getToken();
}

export async function saveToken(token: string): Promise<void> {
  return isDesktop()
    ? TauriTokenService.saveToken(token)
    : BrowserTokenService.saveToken(token);
}

export async function removeToken(): Promise<void> {
  return isDesktop()
    ? TauriTokenService.removeToken()
    : BrowserTokenService.removeToken();
}
