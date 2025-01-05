export const API_BASE_URL = "http://localhost:8080/api";

const headers = (token?: string) => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-Client-Type": "desktop",
  });

export interface Room {
  RoomID: string;
  UserID: number;
  Name: string;
  Type: string;
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

  export async function createRoom(
    name: string,
    // type: string,
    token: string,
    // password?: string
  ): Promise<Room> {
    const type = "public";
    const password = "";
    const response = await fetch(`${API_BASE_URL}/rooms/create`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ name, type, password: password || "" }),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create room");
    }
  
    const data = await response.json();
    return {
      RoomID: data.roomID,
      Name: data.name,
      Type: data.type,
      UserID: data.userID,
      CreatedAt: new Date().toISOString(),
    };
}

export async function deleteRoom(roomID: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}`, {
    method: "DELETE",
    headers: headers(token),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to delete room");
  }
}

export async function fetchInvitedRooms(token: string): Promise<Room[]> {
  const response = await fetch(`${API_BASE_URL}/rooms/invited`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorResponse = await response.json();
    throw new Error(errorResponse.error || "Failed to fetch invited rooms");
  }

  const data = await response.json();
  return data.rooms;
}

export async function inviteFriendToRoom(
  roomID: string,
  friendUserID: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roomID, userID: friendUserID }),
  });

  if (!response.ok) {
    const errorResponse = await response.json();
    throw new Error(errorResponse.error || "Failed to invite friend to room");
  }
}
