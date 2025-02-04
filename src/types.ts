// на всякий случай зеркалим все типы с бэкенда

export interface User {
  id: number;
  userID: string;
  username: string;
  name: string;
  email: string;
  isOnline: boolean;
  createdAt: string;
}

export interface Room {
  RoomID: string;
  UserID: string; // можно использовать string (UUID)
  Name: string;
  Type: string;
  CreatedAt: string;
  isOwner?: boolean;
}

export interface RoomMember {
  id: number;
  roomID: string;
  userID: string;
  role: "admin" | "member" | "viewer";
  joinedAt: string;
}

export interface Friend {
  id: number;
  userID: string;
  friendID: string;
  createdAt: string;
}

export interface FriendRequest {
  id: number;
  fromUserID: string;
  toUserID: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface RoomInvite {
  id: number;
  roomID: string;
  inviterUserID: string;
  invitedUserID: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}
  