/**
 * Chat Page
 * Direct message chat using WireChat WebSocket protocol with direct rooms
 */

import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Video, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWebSocketContext } from "../context/WebSocketContext";
import { useCall } from "../context/CallContext";
import { getOrCreateDirectRoom } from "../services/rooms-api";
import Button from "../components/Button";

const ChatPage: React.FC = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const {
    joinRoom,
    leaveRoom,
    sendMessage,
    getMessagesForRoom,
    isConnected,
  } = useWebSocketContext();
  const { initiateCall, state: callState } = useCall();

  const [inputMessage, setInputMessage] = useState("");
  const [friendUsername, setFriendUsername] = useState("");
  const [friendUserId, setFriendUserId] = useState<number | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const state = location.state as { friendUsername?: string } | null;

  // Get or create direct room
  useEffect(() => {
    const initChat = async () => {
      if (!token || !friendId) return;

      setIsLoading(true);
      setError(null);

      try {
        const targetUserID = Number(friendId);
        if (!Number.isFinite(targetUserID) || targetUserID <= 0) {
          throw new Error("Invalid friend ID");
        }

        setFriendUserId(targetUserID);
        setFriendUsername(state?.friendUsername || `user-${targetUserID}`);

        // Get or create direct room
        const directRoom = await getOrCreateDirectRoom(targetUserID, token);
        const roomIdentifier = directRoom.name || `direct-${directRoom.id}`;
        setRoomName(roomIdentifier);

        // Join the room
        if (isConnected) {
          joinRoom(roomIdentifier);
        }
      } catch (err) {
        console.error("Failed to initialize chat:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize chat");
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

  }, [token, friendId, state?.friendUsername, isConnected, joinRoom]);

  useEffect(() => {
    return () => {
      if (roomName) {
        leaveRoom(roomName);
      }
    };
  }, [roomName, leaveRoom]);

  // Join room when connection is established
  useEffect(() => {
    if (roomName && isConnected) {
      joinRoom(roomName);
    }
  }, [roomName, isConnected, joinRoom]);

  // Get messages for this room
  const messages = roomName ? getMessagesForRoom(roomName) : [];

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!roomName || !inputMessage.trim()) return;
    sendMessage(roomName, inputMessage.trim());
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVideoCall = () => {
    if (friendUserId) {
      initiateCall("direct", friendUserId, friendUsername);
    }
  };

  const canMakeCall = callState.status === "idle" || callState.status === "ended";

  // Format timestamp
  const formatTime = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-gray-600">Loading chat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button variant="primary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">{friendUsername}</h1>
            <p className="text-xs text-gray-500">
              {isConnected ? "Online" : "Connecting..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleVideoCall}
            disabled={!canMakeCall}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Video call"
          >
            <Video className="w-5 h-5 text-primary" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.isLocal || msg.user === user?.username;
            return (
              <div
                key={msg.id || idx}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-white shadow-sm border rounded-bl-md"
                  }`}
                >
                  <p className="break-words">{msg.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMe ? "text-white/70" : "text-gray-400"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim()}
            className="p-3 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
