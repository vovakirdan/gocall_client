export const API_BASE_URL = "http://localhost:8080/api";

const headers = (token?: string) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-Client-Type": "desktop",
  });

export interface Room {
    ID: number;
    UserID: number;
    Name: string;
    CreatedAt: string;
}

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
        throw new Error("Failed to login");
      }
  
      const data = await response.json();
      return data.token; // return JWT
    } catch (error) {
      throw new Error("Unable to connect to the server");
    }
  }  

export async function fetchRooms(token: string): Promise<Room[]> {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: "GET",
      headers: headers(token),
    });
  
    if (!response.ok) {
      throw new Error("Failed to fetch rooms");
    }
  
    const data = await response.json();
    return data.rooms as Room[];
  }  

export async function createRoom(name: string, token: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/rooms/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error("Failed to create room");
  }

  return await response.json();
}
