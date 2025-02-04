export const API_BASE_URL = "http://localhost:8080/api";

export const headers = (token?: string) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-Client-Type": "desktop",
  });

export async function checkAPIStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, { method: "OPTIONS" });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      return response.ok;
    } catch (error) {
      return false;
    }
}  
  
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
