/**
 * WireChat WebSocket Protocol Implementation
 * Handles chat and call signaling via WireChat server
 */

export const PROTOCOL_VERSION = 1;

// === Inbound Message Types ===
export const InboundType = {
  Hello: 'hello',
  Join: 'join',
  Leave: 'leave',
  Msg: 'msg',
  CallInvite: 'call.invite',
  CallAccept: 'call.accept',
  CallReject: 'call.reject',
  CallJoin: 'call.join',
  CallLeave: 'call.leave',
  CallEnd: 'call.end',
} as const;

// === Outbound Event Types ===
export const EventType = {
  Message: 'message',
  UserJoined: 'user_joined',
  UserLeft: 'user_left',
  History: 'history',
  CallIncoming: 'call.incoming',
  CallRinging: 'call.ringing',
  CallAccepted: 'call.accepted',
  CallRejected: 'call.rejected',
  CallJoinInfo: 'call.join-info',
  CallParticipantJoined: 'call.participant-joined',
  CallParticipantLeft: 'call.participant-left',
  CallEnded: 'call.ended',
} as const;

// === Data Types ===

export interface HelloData {
  user?: string;
  token?: string;
  protocol: number;
}

export interface JoinData {
  room: string;
}

export interface MsgData {
  room: string;
  text: string;
}

export interface CallInviteData {
  call_type: 'direct' | 'room';
  to_user_id?: number;
  room_id?: number;
}

export interface CallActionData {
  call_id: string;
  reason?: string;
}

// === Event Data Types ===

export interface EventMessage {
  id: number;
  room: string;
  user: string;
  text: string;
  ts: number;
}

export interface EventUserJoined {
  room: string;
  user: string;
}

export interface EventUserLeft {
  room: string;
  user: string;
}

export interface EventHistory {
  room: string;
  messages: EventMessage[];
}

export interface EventCallIncoming {
  call_id: string;
  call_type: 'direct' | 'room';
  from_user_id: number;
  from_username: string;
  room_id?: number;
  room_name?: string;
  created_at: number;
}

export interface EventCallRinging {
  call_id: string;
  to_user_id: number;
  to_username: string;
}

export interface EventCallAccepted {
  call_id: string;
  accepted_by_user_id: number;
  accepted_by_username: string;
}

export interface EventCallRejected {
  call_id: string;
  rejected_by_user_id: number;
  reason?: string;
}

export interface EventCallJoinInfo {
  call_id: string;
  url: string;
  token: string;
  room_name: string;
  identity: string;
}

export interface EventCallParticipantJoined {
  call_id: string;
  user_id: number;
  username: string;
}

export interface EventCallParticipantLeft {
  call_id: string;
  user_id: number;
  username: string;
  reason?: string;
}

export interface EventCallEnded {
  call_id: string;
  ended_by_user_id: number;
  reason: string;
}

export interface ProtocolError {
  code: string;
  msg: string;
}

// === Wire Message Types ===

interface InboundMessage {
  type: string;
  data?: unknown;
}

interface OutboundMessage {
  type: 'event' | 'error';
  event?: string;
  data?: unknown;
  error?: ProtocolError;
}

// === Connection State ===

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// === Event Handlers ===

export interface WirechatEventHandlers {
  // Connection events
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnecting?: (attempt: number) => void;
  onError?: (error: ProtocolError | Error) => void;
  onStateChanged?: (state: ConnectionState) => void;

  // Chat events
  onMessage?: (data: EventMessage) => void;
  onUserJoined?: (data: EventUserJoined) => void;
  onUserLeft?: (data: EventUserLeft) => void;
  onHistory?: (data: EventHistory) => void;

  // Call events
  onCallIncoming?: (data: EventCallIncoming) => void;
  onCallRinging?: (data: EventCallRinging) => void;
  onCallAccepted?: (data: EventCallAccepted) => void;
  onCallRejected?: (data: EventCallRejected) => void;
  onCallJoinInfo?: (data: EventCallJoinInfo) => void;
  onCallParticipantJoined?: (data: EventCallParticipantJoined) => void;
  onCallParticipantLeft?: (data: EventCallParticipantLeft) => void;
  onCallEnded?: (data: EventCallEnded) => void;
}

// === WireChat WebSocket Client ===

export class WirechatClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private username: string;
  private handlers: WirechatEventHandlers = {};
  private state: ConnectionState = 'disconnected';
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private joinedRooms: Set<string> = new Set();

  constructor(url: string, token: string, username: string) {
    this.url = url;
    this.token = token;
    this.username = username;
  }

  // === Connection Management ===

  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (err) {
      this.handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.joinedRooms.clear();

    if (this.ws) {
      this.ws.close(1000, 'client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
  }

  reconnect(): void {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.setState('error');
      this.handlers.onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempt++;
    this.setState('reconnecting');
    this.handlers.onReconnecting?.(this.reconnectAttempt);

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempt - 1);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.handlers.onStateChanged?.(newState);
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.sendHello();
    };

    this.ws.onclose = (event) => {
      if (event.code !== 1000) {
        // Abnormal close, attempt reconnect
        this.reconnect();
      } else {
        this.setState('disconnected');
        this.handlers.onDisconnected?.();
      }
    };

    this.ws.onerror = () => {
      // Error will be followed by close event
      this.handleError(new Error('WebSocket error'));
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  private handleMessage(rawData: string): void {
    try {
      const msg = JSON.parse(rawData) as OutboundMessage;

      if (msg.type === 'error' && msg.error) {
        this.handlers.onError?.(msg.error);
        return;
      }

      if (msg.type === 'event' && msg.event) {
        this.dispatchEvent(msg.event, msg.data);
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }

  private dispatchEvent(eventType: string, data: unknown): void {
    switch (eventType) {
      // Chat events
      case EventType.Message:
        this.handlers.onMessage?.(data as EventMessage);
        break;
      case EventType.UserJoined:
        this.handlers.onUserJoined?.(data as EventUserJoined);
        break;
      case EventType.UserLeft:
        this.handlers.onUserLeft?.(data as EventUserLeft);
        break;
      case EventType.History:
        this.handlers.onHistory?.(data as EventHistory);
        break;

      // Call events
      case EventType.CallIncoming:
        this.handlers.onCallIncoming?.(data as EventCallIncoming);
        break;
      case EventType.CallRinging:
        this.handlers.onCallRinging?.(data as EventCallRinging);
        break;
      case EventType.CallAccepted:
        this.handlers.onCallAccepted?.(data as EventCallAccepted);
        break;
      case EventType.CallRejected:
        this.handlers.onCallRejected?.(data as EventCallRejected);
        break;
      case EventType.CallJoinInfo:
        this.handlers.onCallJoinInfo?.(data as EventCallJoinInfo);
        break;
      case EventType.CallParticipantJoined:
        this.handlers.onCallParticipantJoined?.(data as EventCallParticipantJoined);
        break;
      case EventType.CallParticipantLeft:
        this.handlers.onCallParticipantLeft?.(data as EventCallParticipantLeft);
        break;
      case EventType.CallEnded:
        this.handlers.onCallEnded?.(data as EventCallEnded);
        break;

      default:
        console.warn('Unknown event type:', eventType);
    }
  }

  private handleError(error: Error): void {
    this.setState('error');
    this.handlers.onError?.(error);
  }

  // === Send Methods ===

  private send(type: string, data?: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] WebSocket not open, cannot send message. State:', this.ws?.readyState);
      return;
    }

    const msg: InboundMessage = { type };
    if (data !== undefined) {
      msg.data = data;
    }

    console.log('[WS] Sending:', JSON.stringify(msg));
    this.ws.send(JSON.stringify(msg));
  }

  private sendHello(): void {
    const data: HelloData = {
      protocol: PROTOCOL_VERSION,
      token: this.token,
      user: this.username,
    };
    this.send(InboundType.Hello, data);

    // After hello, re-join any rooms we were in
    this.setState('connected');
    this.handlers.onConnected?.();

    // Rejoin rooms after reconnect
    for (const room of this.joinedRooms) {
      this.send(InboundType.Join, { room } as JoinData);
    }
  }

  // === Chat Methods ===

  joinRoom(room: string): void {
    this.joinedRooms.add(room);
    if (this.state === 'connected') {
      this.send(InboundType.Join, { room } as JoinData);
    }
  }

  leaveRoom(room: string): void {
    this.joinedRooms.delete(room);
    if (this.state === 'connected') {
      this.send(InboundType.Leave, { room } as JoinData);
    }
  }

  sendMessage(room: string, text: string): void {
    const data: MsgData = { room, text };
    this.send(InboundType.Msg, data);
  }

  // === Call Methods ===

  inviteDirectCall(toUserId: number): void {
    const data: CallInviteData = {
      call_type: 'direct',
      to_user_id: toUserId,
    };
    this.send(InboundType.CallInvite, data);
  }

  inviteRoomCall(roomId: number): void {
    const data: CallInviteData = {
      call_type: 'room',
      room_id: roomId,
    };
    this.send(InboundType.CallInvite, data);
  }

  acceptCall(callId: string): void {
    const data: CallActionData = { call_id: callId };
    this.send(InboundType.CallAccept, data);
  }

  rejectCall(callId: string, reason?: string): void {
    const data: CallActionData = { call_id: callId, reason };
    this.send(InboundType.CallReject, data);
  }

  joinCall(callId: string): void {
    const data: CallActionData = { call_id: callId };
    this.send(InboundType.CallJoin, data);
  }

  leaveCall(callId: string, reason?: string): void {
    const data: CallActionData = { call_id: callId, reason };
    this.send(InboundType.CallLeave, data);
  }

  endCall(callId: string): void {
    const data: CallActionData = { call_id: callId };
    this.send(InboundType.CallEnd, data);
  }

  // === Event Handler Management ===

  setHandlers(handlers: WirechatEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  clearHandlers(): void {
    this.handlers = {};
  }

  // === Getters ===

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  getJoinedRooms(): string[] {
    return Array.from(this.joinedRooms);
  }
}

// === Factory function ===

export function createWirechatClient(
  serverUrl: string,
  token: string,
  username: string
): WirechatClient {
  // Ensure we connect to /ws endpoint
  const url = serverUrl.endsWith('/ws') ? serverUrl : `${serverUrl}/ws`;
  return new WirechatClient(url, token, username);
}
