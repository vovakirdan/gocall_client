import React, { useEffect, useState, useRef } from "react";
import { User, Friend } from "../types";

/**
 * Props for ChatWindow component
 * @param {string} friendUserId - The friend's UUID from the backend
 * @param {User} currentUser - The currently logged-in user object
 * @param {string} token - The auth token
 * @param {() => void} onClose - Callback to close the chat window
 */
interface ChatWindowProps {
  friendUser: Friend;
  currentUser: User;
  token: string;
  onClose: () => void;
}

interface ChatMessage {
  from: string;
  to: string;
  message: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  friendUser,
  currentUser,
  token,
  onClose,
}) => {
  // Local state to store messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>("");

  // WebSocket reference
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = "ws://localhost:8080/api/chat/ws?token=" + token;
    socketRef.current = new WebSocket(wsUrl);

    // Handle incoming messages
    socketRef.current.onmessage = (event: MessageEvent) => {
      try {
        const data: ChatMessage = JSON.parse(event.data);
        console.log("Incoming chat message:", data);

        // We only add messages relevant to this open conversation
        // (if the friend is the "from" or "to")
        if (
          (data.from === friendUser.user_id && data.to === currentUser.user_id) ||
          (data.from === currentUser.user_id && data.to === friendUser.user_id)
        ) {
          setMessages((prev) => [...prev, data]);
        }
      } catch (err) {
        console.error("Error parsing incoming WebSocket data:", err);
      }
    };

    // Handle errors
    socketRef.current.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
    };

    // Cleanup when component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [friendUser, currentUser]);

  // Send message to server via WebSocket
  const handleSendMessage = (): void => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not open.");
      return;
    }

    if (!inputMessage.trim()) return;

    // Construct the outgoing message
    const payload: ChatMessage = {
      from: currentUser.user_id,
      to: friendUser.user_id,
      message: inputMessage.trim(),
    };

    // Send JSON to server
    socketRef.current.send(JSON.stringify(payload));

    // Optimistically update local state
    setMessages((prev) => [...prev, payload]);
    setInputMessage("");
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 rounded-lg w-full max-w-sm flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">
            Chat with {friendUser.username}
          </h2>
          <button
            onClick={onClose}
            className="text-red-500 border border-red-500 px-2 rounded"
          >
            Close
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 border p-2 mb-2 overflow-auto h-64">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet</p>
          ) : (
            <ul>
              {messages.map((msg, index) => {
                const isMe = msg.from === currentUser.user_id;
                return (
                  <li
                    key={index}
                    className={`mb-1 ${
                      isMe
                        ? "text-right text-blue-600"
                        : "text-left text-gray-700"
                    }`}
                  >
                    <span>
                      <strong>{isMe ? "Me" : "Friend"}:</strong> {msg.message}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Message Input */}
        <div className="flex">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            className="border flex-1 p-2 rounded-l"
            placeholder="Type your message..."
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded-r"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
