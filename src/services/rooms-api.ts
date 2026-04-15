import { RoomInvite, Room } from "../types";
import { headers } from "./api";
import { API_BASE_URL } from "./config";

async function getAPIError(response: Response, fallback: string): Promise<string> {
  const errorData = await response.json().catch(() => ({}));
  const message =
    typeof errorData.error === "string" && errorData.error.length > 0
      ? errorData.error
      : fallback;

  if (response.status === 401) {
    return `Session expired: ${message}`;
  }

  return message;
}

// RoomMemberState represents one room member in the room state response.
export interface RoomMemberState {
  id: number;
  user_id: string;
  username: string;
  name: string;
  is_online: boolean;
  role: string;
  joined_at: string;
}

// RoomVoiceParticipantState represents one active room voice participant.
export interface RoomVoiceParticipantState {
  id: number;
  user_id: string;
  username: string;
  name: string;
  is_online: boolean;
  is_mic_enabled: boolean;
  is_camera_enabled: boolean;
  is_screen_sharing: boolean;
  joined_at: string;
  updated_at: string;
}

// RoomStateResponse contains room metadata, members, and room voice presence.
export interface RoomStateResponse {
  room: {
    id: number;
    room_id: string;
    user_id: string;
    name: string;
    type: string;
    password: string;
    created_at: string;
  };
  members: RoomMemberState[];
  voice_participants: RoomVoiceParticipantState[];
  in_voice: boolean;
}

// RoomVoiceCredentialsResponse contains LiveKit join credentials for room voice.
export interface RoomVoiceCredentialsResponse {
  url: string;
  token: string;
  room_name: string;
  identity: string;
  name: string;
}

const normalizeRoom = (payload: {
  room_id: string;
  user_id: string;
  name: string;
  type: string;
  created_at: string;
}): Room => ({
  room_id: payload.room_id,
  user_id: payload.user_id,
  name: payload.name,
  type: payload.type,
  created_at: payload.created_at,
});

async function fetchRoom(roomID: string, token: string): Promise<Room> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error(await getAPIError(response, "Failed to fetch room"));
  }

  const payload = (await response.json()) as {
    room?: {
      room_id: string;
      user_id: string;
      name: string;
      type: string;
      created_at: string;
    };
  };

  if (!payload.room) {
    throw new Error("Room payload is missing in response");
  }

  return normalizeRoom(payload.room);
}

async function fetchRoomUpdatePayload(
  roomID: string,
  token: string
): Promise<{ type: string; password: string }> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error(await getAPIError(response, "Failed to fetch room"));
  }

  const payload = (await response.json()) as {
    room?: {
      type?: string;
      password?: string;
    };
  };

  if (!payload.room?.type) {
    throw new Error("Room update payload is missing in response");
  }

  return {
    type: payload.room.type,
    password: typeof payload.room.password === "string" ? payload.room.password : "",
  };
}

// Функция для получения списка приглашений в комнаты (GET /api/rooms/invites)
export async function fetchRoomInvites(token: string): Promise<RoomInvite[]> {
  void token;
  return [];
}

// Функция для принятия приглашения в комнату (POST /api/rooms/invite/accept)
export async function acceptRoomInvite(inviteId: number, token: string): Promise<void> {
  void inviteId;
  void token;
  throw new Error("Room invites are not implemented on this server");
}

// Функция для отклонения приглашения в комнату (POST /api/rooms/invite/decline)
export async function declineRoomInvite(inviteId: number, token: string): Promise<void> {
  void inviteId;
  void token;
  throw new Error("Room invites are not implemented on this server");
}

/** Получаем комнаты пользователя (GET /rooms) */
export async function fetchMyRooms(token: string): Promise<Room[]> {
  const response = await fetch(`${API_BASE_URL}/rooms/mine`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch rooms");
  }
  const data = await response.json();
  // Server returns array directly, or { rooms: [...] }
  const rooms = Array.isArray(data) ? data : (Array.isArray(data.rooms) ? data.rooms : []);
  return rooms.map((r: { id?: number; room_id: string; name: string; type: string; user_id: string; created_at: string }) => ({
    room_id: r.room_id,
    user_id: r.user_id,
    name: r.name,
    type: r.type,
    created_at: r.created_at,
  }));
}

/** Создание комнаты (POST /rooms) */
export async function createRoom(name: string, token: string): Promise<Room> {
  const type = "public"; // можно расширить по необходимости
  const response = await fetch(`${API_BASE_URL}/rooms/create`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ name, type }),
  });
  if (!response.ok) {
    throw new Error(await getAPIError(response, "Failed to create room"));
  }
  const data = (await response.json()) as { roomID?: string };
  if (!data.roomID) {
    throw new Error("Created room ID is missing in response");
  }

  return fetchRoom(data.roomID, token);
}

/** Удаление комнаты (DELETE /rooms/:id) */
export async function deleteRoom(roomID: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error(await getAPIError(response, "Failed to delete room"));
  }
}

/** Join room as member (POST /rooms/:id/join) - required for calls */
export async function joinRoomAsMember(roomID: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}/join`, {
    method: "POST",
    headers: headers(token),
  });
  if (!response.ok) {
    const message = await getAPIError(response, "Failed to join room");
    if (!message.toLowerCase().includes("already")) {
      throw new Error(message);
    }
  }
}

// fetchRoomState returns the current room metadata and room voice presence snapshot.
export async function fetchRoomState(roomID: string, token: string): Promise<RoomStateResponse> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}/state`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error(await getAPIError(response, "Failed to fetch room state"));
  }
  return response.json();
}

// joinRoomVoice creates room-scoped voice presence for the current user.
export async function joinRoomVoice(roomID: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}/voice/join`, {
    method: "POST",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error(await getAPIError(response, "Failed to join room voice"));
  }
}

// leaveRoomVoice removes room-scoped voice presence for the current user.
export async function leaveRoomVoice(roomID: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}/voice/leave`, {
    method: "POST",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error(await getAPIError(response, "Failed to leave room voice"));
  }
}

// updateRoomVoiceMedia updates room voice media flags for the current user.
export async function updateRoomVoiceMedia(
  roomID: string,
  payload: {
    is_mic_enabled?: boolean;
    is_camera_enabled?: boolean;
    is_screen_sharing?: boolean;
  },
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}/voice/media`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await getAPIError(response, "Failed to update room voice media"));
  }
}

// fetchRoomVoiceCredentials fetches LiveKit credentials for the current room voice session.
export async function fetchRoomVoiceCredentials(
  roomID: string,
  token: string
): Promise<RoomVoiceCredentialsResponse> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}/voice/credentials`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error(await getAPIError(response, "Failed to fetch room voice credentials"));
  }
  return response.json();
}

/** Получаем приглашённые комнаты - not implemented in WireChat */
export async function fetchInvitedRooms(_token: string): Promise<Room[]> {
  // Room invites not implemented in WireChat server - return empty array
  return [];
}

/** Приглашение друга в комнату (POST /rooms/invite) */
export async function inviteFriendToRoom(
  roomID: string,
  username: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/invite`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ roomID, username }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to invite friend to room");
  }
}

/** Обновление комнаты (PUT /rooms/:id) */
export async function updateRoom(roomID: string, name: string, token: string): Promise<void> {
  const currentRoom = await fetchRoomUpdatePayload(roomID, token);
  const response = await fetch(`${API_BASE_URL}/rooms/${roomID}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({
      name,
      type: currentRoom.type,
      password: currentRoom.password,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update room");
  }
}

/** Create or get direct message room with a user (POST /rooms/direct) */
export async function getOrCreateDirectRoom(userId: string, token: string): Promise<Room> {
  const response = await fetch(`${API_BASE_URL}/rooms/direct`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ friend_user_id: userId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create direct room");
  }
  const payload = await response.json();
  const room = payload.room ?? payload;

  return {
    room_id: room.room_id,
    user_id: room.user_id,
    name: room.name,
    type: room.type,
    created_at: room.created_at,
  };
}
