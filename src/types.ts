export interface Room {
    RoomID: string;
    UserID: string; // можно использовать string (UUID)
    Name: string;
    Type: string;
    CreatedAt: string;
    isOwner?: boolean;
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
  