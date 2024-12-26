export const API_BASE_URL = "http://localhost:8080/api";

export interface Room {
    ID: number;
    UserID: number;
    Name: string;
    CreatedAt: string;
  }  

export async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Failed to login");
  }

  const data = await response.json();
  return data.token; // Returns JWT
}

export async function fetchRooms(token: string): Promise<Room[]> {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
