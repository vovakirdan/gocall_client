import { headers } from "./api";
import { API_BASE_URL } from "./config";

export interface CallResponse {
  id: string;
  type: string;
  mode: string;
  initiator_user_id: number;
  room_id?: number;
  status: string;
  external_room_id?: string;
  created_at: string;
  updated_at: string;
  ended_at?: string;
}

export interface JoinCallResponse {
  url: string;
  token: string;
  room_name: string;
  identity: string;
}

/** Create a direct (1-on-1) call */
export async function createDirectCall(toUserId: number, token: string): Promise<CallResponse> {
  const response = await fetch(`${API_BASE_URL}/calls/direct`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ to_user_id: toUserId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create direct call");
  }
  return response.json();
}

/** Create a room call */
export async function createRoomCall(roomId: number, token: string): Promise<CallResponse> {
  const response = await fetch(`${API_BASE_URL}/calls/room`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ room_id: roomId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create room call");
  }
  return response.json();
}

/** Join a call - get LiveKit connection info */
export async function joinCall(callId: string, token: string): Promise<JoinCallResponse> {
  const response = await fetch(`${API_BASE_URL}/calls/${callId}/join`, {
    method: "GET",
    headers: headers(token),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to join call");
  }
  return response.json();
}

/** End a call */
export async function endCall(callId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/calls/${callId}/end`, {
    method: "PUT",
    headers: headers(token),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to end call");
  }
}
