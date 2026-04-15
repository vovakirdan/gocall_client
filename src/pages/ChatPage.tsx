import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Send, Video } from "lucide-react";

import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { getUserInfo } from "../services/api";
import {
  connectDirectChatSocket,
  fetchDirectChatHistory,
} from "../services/chat-api";
import { getOrCreateDirectRoom } from "../services/rooms-api";

interface ChatMessageView {
  id: number | string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
}

const ChatPage: React.FC = () => {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();

  const [friendUsername, setFriendUsername] = useState("");
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadRequestIdRef = useRef(0);
  const routeState = location.state as { friendUsername?: string } | null;

  const friendUserID = friendId ? decodeURIComponent(friendId) : "";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const loadChat = async () => {
      if (!token || !friendUserID) {
        setIsLoading(false);
        return;
      }

      const requestId = loadRequestIdRef.current + 1;
      loadRequestIdRef.current = requestId;
      setIsLoading(true);
      setError(null);

      try {
        const [history, friendInfo] = await Promise.all([
          fetchDirectChatHistory(token, friendUserID),
          routeState?.friendUsername
            ? Promise.resolve({
                id: 0,
                username: routeState.friendUsername,
                name: routeState.friendUsername,
              })
            : getUserInfo(token, friendUserID),
        ]);

        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        setMessages(history);
        setFriendUsername(friendInfo.username || `user-${friendUserID}`);
      } catch (err) {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        if (loadRequestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    };

    void loadChat();
  }, [friendUserID, routeState?.friendUsername, token]);

  useEffect(() => {
    if (!token || !user?.user_id || !friendUserID) {
      return undefined;
    }

    const socket = connectDirectChatSocket(token, {
      onOpen: () => setIsSocketOpen(true),
      onClose: () => setIsSocketOpen(false),
      onError: () => {
        setIsSocketOpen(false);
        setError((current) => current ?? "Chat connection error");
      },
      onMessage: (message) => {
        const isRelevant =
          (message.from === friendUserID && message.to === user.user_id) ||
          (message.from === user.user_id && message.to === friendUserID);

        if (!isRelevant) {
          return;
        }

        setMessages((current) => [
          ...current,
          {
            id: `${message.from}-${Date.now()}`,
            sender_id: message.from,
            receiver_id: message.to,
            text: message.message,
            created_at: new Date().toISOString(),
          },
        ]);
      },
    });

    socketRef.current = socket;

    return () => {
      socket.close(1000, "chat page closed");
      socketRef.current = null;
    };
  }, [friendUserID, token, user?.user_id]);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      ),
    [messages]
  );

  const handleSend = () => {
    const text = inputMessage.trim();
    if (!text || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN || !user) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        to: friendUserID,
        message: text,
      })
    );

    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        sender_id: user.user_id,
        receiver_id: friendUserID,
        text,
        created_at: new Date().toISOString(),
      },
    ]);
    setInputMessage("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleOpenVoiceRoom = async () => {
    if (!token) return;

    try {
      const room = await getOrCreateDirectRoom(friendUserID, token);
      navigate(`/room/${encodeURIComponent(room.room_id)}`, {
        state: { roomName: `Private voice with ${friendUsername || "friend"}` },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open private voice room");
    }
  };

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-gray-600">Loading chat...</p>
      </div>
    );
  }

  if (error && sortedMessages.length === 0) {
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
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">{friendUsername || "Direct chat"}</h1>
            <p className="text-xs text-gray-500">
              {isSocketOpen ? "Connected" : "Connecting..."}
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleOpenVoiceRoom()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Open private voice room"
        >
          <Video className="w-5 h-5 text-primary" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation.</p>
          </div>
        ) : (
          sortedMessages.map((msg) => {
            const isMe = msg.sender_id === user?.user_id;
            return (
              <div
                key={msg.id}
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
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      <div className="p-4 bg-white border-t">
        {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(event) => setInputMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || !isSocketOpen}
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
