import { UserInfo, User } from "../types";
import { API_BASE_URL } from "./config";

// Decode JWT token to extract user info (no server call needed)
export function decodeJWT(token: string): User | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));

    return {
      id: payload.user_id,
      user_id: String(payload.user_id),
      username: payload.username,
      name: payload.username,
      email: '',
      is_online: true,
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export const headers = (token?: string) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-Client-Type": "desktop",
  });

export async function checkAPIStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/ping`, { method: "GET" });
    const data = await response.json();
    console.log("Ping", data.message);
    return data.message === "pong";
  } catch (error) {
    return false;
  }
}

export async function validateToken(token: string): Promise<boolean> {
  try {
    // Decode JWT locally - no server call needed
    const user = decodeJWT(token);
    if (!user) return false;

    // Check expiration (JWT exp claim is in seconds)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false; // Token expired
    }

    return true;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}
  
export async function login(username: string, password: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to login");
    }

    const data = await response.json();
    return data.token; // return JWT
  } catch (error: any) {
    throw new Error(error.message || "Unable to connect to the server");
  }
}

export async function register(username: string, password: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to register");
    }

    const data = await response.json();
    return data.token || "Registration successful";
  } catch (error: any) {
    throw new Error(error.message || "Unable to connect to the server");
  }
}

export async function getUserID(token: string): Promise<string> {
  const user = decodeJWT(token);
  if (!user) {
    throw new Error("Invalid token");
  }
  return String(user.id);
}

// Backward-compatible fallback for legacy UI code.
// Current backend has no public GET /api/user/:id endpoint.
export async function getUserInfo(token: string, uuid: string): Promise<UserInfo> {
  void token;
  return {
    id: Number(uuid) || 0,
    username: `user-${uuid}`,
    name: `user-${uuid}`,
  };
}

export async function getMe(token: string): Promise<User> {
  const user = decodeJWT(token);
  if (!user) {
    throw new Error("Invalid token");
  }
  return user;
}
