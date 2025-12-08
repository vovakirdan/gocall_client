import { UserInfo, User } from "../types";

export const API_BASE_URL = "http://localhost:8080/api";

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

    return "Registration successful";
  } catch (error: any) {
    throw new Error(error.message || "Unable to connect to the server");
  }
}

export async function getUserID(token: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/user/id`, {
    method: "GET",
    headers: headers(token),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch user ID");
  }

  const data = await response.json();
  return data.userUUID;
}

// получить UserInfo по UUID
export async function getUserInfo(token: string, uuid: string): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/user/${uuid}`, {
    method: "GET",
    headers: headers(token),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch user info");
  }

  const data = await response.json();
  return Array.isArray(data.user) ? data.user[0] : data.user;
}

export async function getMe(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/user/me`, {
    method: "GET",
    headers: headers(token),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch user info");
  }

  const data = await response.json();
  return data;
}
