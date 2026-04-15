import { UserInfo, User } from "../types";
import { API_BASE_URL } from "./config";

// Decode JWT token to extract user info (no server call needed)
export function decodeJWT(token: string): User | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) {
      return null;
    }
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    return {
      id: payload.user_id,
      user_id: String(payload.user_id),
      username: payload.username ?? "",
      name: payload.name ?? payload.username ?? "",
      email: "",
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

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const normalizeUserPayload = (payload: unknown): User => {
  const root =
    payload && typeof payload === "object" && "user" in payload
      ? (payload as { user?: unknown }).user
      : payload;

  if (!root || typeof root !== "object") {
    throw new Error("Current user payload is missing");
  }

  const candidate = root as Record<string, unknown>;
  const username =
    typeof candidate.username === "string"
      ? candidate.username
      : typeof candidate.Username === "string"
        ? candidate.Username
        : typeof candidate.user_name === "string"
          ? candidate.user_name
          : typeof candidate.UserName === "string"
            ? candidate.UserName
            : "";
  const userID =
    typeof candidate.user_id === "string"
      ? candidate.user_id
      : typeof candidate.UserID === "string"
        ? candidate.UserID
        : "";

  if (!username || !userID) {
    throw new Error("Current user payload is invalid");
  }

  const id = toNumber(candidate.id ?? candidate.ID);
  const name =
    typeof candidate.name === "string"
      ? candidate.name
      : typeof candidate.Name === "string"
        ? candidate.Name
        : username;
  const email =
    typeof candidate.email === "string"
      ? candidate.email
      : typeof candidate.Email === "string"
        ? candidate.Email
        : "";
  const isOnline =
    typeof candidate.is_online === "boolean"
      ? candidate.is_online
      : typeof candidate.IsOnline === "boolean"
        ? candidate.IsOnline
        : true;
  const createdAt =
    typeof candidate.created_at === "string"
      ? candidate.created_at
      : typeof candidate.CreatedAt === "string"
        ? candidate.CreatedAt
        : new Date().toISOString();

  return {
    id,
    user_id: userID,
    username,
    name,
    email,
    is_online: isOnline,
    created_at: createdAt,
  };
};

// checkAPIStatus verifies that the backend healthcheck endpoint responds.
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

// validateToken confirms token freshness locally and against the backend profile endpoint.
export async function validateToken(token: string): Promise<boolean> {
  try {
    const user = decodeJWT(token);
    if (!user) return false;

    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/user/me`, {
      method: "GET",
      headers: headers(token),
    });

    return response.ok;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
}
  
// login authenticates a user and returns the issued JWT.
export async function login(username: string, password: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
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

// register creates a new user account and returns the server response token if present.
export async function register(username: string, password: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
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

// getUserID fetches the authenticated user's UUID from the backend.
export async function getUserID(token: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/user/id`, {
    method: "GET",
    headers: headers(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch current user ID");
  }

  const payload = (await response.json()) as { userID?: string };
  if (!payload.userID) {
    throw new Error("Current user ID is missing in response");
  }

  return payload.userID;
}

// Backward-compatible fallback for legacy UI code.
// Current backend has no public GET /api/user/:id endpoint.
export async function getUserInfo(token: string, uuid: string): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/user/${uuid}`, {
    method: "GET",
    headers: headers(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch user info");
  }

  const payload = (await response.json()) as {
    user?:
      | UserInfo
      | {
          ID?: number;
          Username?: string;
          Name?: string;
          id?: number;
          username?: string;
          name?: string;
        };
  };

  const user = payload.user;
  if (!user) {
    throw new Error("User info is missing in response");
  }

  const legacyUser = user as {
    ID?: number;
    Username?: string;
    Name?: string;
    id?: number;
    username?: string;
    name?: string;
  };

  return {
    id: typeof legacyUser.id === "number" ? legacyUser.id : (legacyUser.ID ?? 0),
    username: legacyUser.username ?? legacyUser.Username ?? `user-${uuid}`,
    name: legacyUser.name ?? legacyUser.Name ?? `user-${uuid}`,
  };
}

// getMe fetches the authenticated user's current profile from the backend.
export async function getMe(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/user/me`, {
    method: "GET",
    headers: headers(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch current user");
  }

  return normalizeUserPayload(await response.json());
}
