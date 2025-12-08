/**
 * WebSocket Context
 * Manages WireChat WebSocket connection for real-time chat
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import {
  WirechatClient,
  createWirechatClient,
  ConnectionState,
  EventUserJoined,
  EventUserLeft,
  WirechatEventHandlers,
} from '../services/wirechat-ws';

// === Types ===

export interface ChatMessage {
  id: number;
  room: string;
  user: string;
  text: string;
  timestamp: number;
  isLocal?: boolean;
}

export interface RoomState {
  name: string;
  messages: ChatMessage[];
  users: string[];
}

interface WebSocketContextValue {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;

  // Chat
  messages: ChatMessage[];
  roomMessages: Map<string, ChatMessage[]>;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  sendMessage: (room: string, text: string) => void;
  getMessagesForRoom: (room: string) => ChatMessage[];
  joinedRooms: string[];

  // User events
  userJoined: EventUserJoined | null;
  userLeft: EventUserLeft | null;

  // Raw client for CallContext
  wirechatClient: WirechatClient | null;
}

// === Context ===

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

// === Provider ===

interface WebSocketProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  serverUrl = 'ws://localhost:8080',
}) => {
  const { token, user } = useAuth();
  const clientRef = useRef<WirechatClient | null>(null);

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomMessages, setRoomMessages] = useState<Map<string, ChatMessage[]>>(new Map());
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const [userJoined, setUserJoined] = useState<EventUserJoined | null>(null);
  const [userLeft, setUserLeft] = useState<EventUserLeft | null>(null);

  // Create and connect client when authenticated
  useEffect(() => {
    if (!token || !user) {
      // Disconnect if logged out
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setConnectionState('disconnected');
      return;
    }

    // Create new client
    const client = createWirechatClient(serverUrl, token, user.username || user.user_id);
    clientRef.current = client;

    // Setup event handlers
    const handlers: WirechatEventHandlers = {
      onStateChanged: (state) => {
        setConnectionState(state);
      },
      onConnected: () => {
        setJoinedRooms(client.getJoinedRooms());
      },
      onDisconnected: () => {
        // Clear state on disconnect if needed
      },
      onMessage: (data) => {
        const msg: ChatMessage = {
          id: data.id,
          room: data.room,
          user: data.user,
          text: data.text,
          timestamp: data.ts,
          isLocal: data.user === user.username,
        };

        // Add to global messages
        setMessages((prev) => [...prev, msg]);

        // Add to room-specific messages
        setRoomMessages((prev) => {
          const newMap = new Map(prev);
          const roomMsgs = newMap.get(data.room) || [];
          newMap.set(data.room, [...roomMsgs, msg]);
          return newMap;
        });
      },
      onHistory: (data) => {
        const msgs: ChatMessage[] = data.messages.map((m) => ({
          id: m.id,
          room: data.room,
          user: m.user,
          text: m.text,
          timestamp: m.ts,
          isLocal: m.user === user.username,
        }));

        // Set room messages from history
        setRoomMessages((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.room, msgs);
          return newMap;
        });

        // Add to global messages
        setMessages((prev) => {
          // Filter out duplicates
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = msgs.filter((m) => !existingIds.has(m.id));
          return [...prev, ...newMsgs];
        });
      },
      onUserJoined: (data) => {
        setUserJoined(data);
        // Clear after a short delay to allow UI to react
        setTimeout(() => setUserJoined(null), 100);
      },
      onUserLeft: (data) => {
        setUserLeft(data);
        // Clear after a short delay to allow UI to react
        setTimeout(() => setUserLeft(null), 100);
      },
      onError: (error) => {
        console.error('WireChat error:', 'msg' in error ? error.msg : error.message);
      },
    };

    client.setHandlers(handlers);
    client.connect();

    // Cleanup
    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [token, user, serverUrl]);

  // === Actions ===

  const joinRoom = useCallback((room: string) => {
    if (clientRef.current) {
      clientRef.current.joinRoom(room);
      setJoinedRooms((prev) => (prev.includes(room) ? prev : [...prev, room]));
    }
  }, []);

  const leaveRoom = useCallback((room: string) => {
    if (clientRef.current) {
      clientRef.current.leaveRoom(room);
      setJoinedRooms((prev) => prev.filter((r) => r !== room));
    }
  }, []);

  const sendMessage = useCallback(
    (room: string, text: string) => {
      if (!clientRef.current || !user) return;

      clientRef.current.sendMessage(room, text);

      // Optimistic update - message will be echoed back from server
      // but we can show it immediately
    },
    [user]
  );

  const getMessagesForRoom = useCallback(
    (room: string): ChatMessage[] => {
      return roomMessages.get(room) || [];
    },
    [roomMessages]
  );

  // === Context Value ===

  const value: WebSocketContextValue = {
    connectionState,
    isConnected: connectionState === 'connected',
    messages,
    roomMessages,
    joinRoom,
    leaveRoom,
    sendMessage,
    getMessagesForRoom,
    joinedRooms,
    userJoined,
    userLeft,
    wirechatClient: clientRef.current,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// === Hook ===

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

// Legacy alias for backwards compatibility
export const useWebSocket = useWebSocketContext;
