import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWebSocketContext } from "../context/WebSocketContext";
import Button from "../components/Button";

/**
 * A dedicated chat page that retrieves the :friendId param,
 * filters messages, and allows sending new messages.
 */
const ChatPage: React.FC = () => {
  const { friendId } = useParams(); // The URL param
  const { user } = useAuth();
  const { messages, sendMessage } = useWebSocketContext();

  const [inputMessage, setInputMessage] = useState<string>("");

  // Filter relevant messages for this friend
  const chatMessages = messages.filter(
    (msg) =>
      (msg.from === user?.user_id && msg.to === friendId) ||
      (msg.from === friendId && msg.to === user?.user_id)
  );

  const handleSend = () => {
    if (!friendId || !inputMessage.trim()) return;
    sendMessage(friendId, inputMessage.trim());
    setInputMessage("");
  };

  useEffect(() => {
    // Example: scroll to bottom or any effect when friendId changes
  }, [friendId]);

  return (
    <div className="p-4 flex flex-col gap-4 h-screen">
      <h1 className="text-2xl font-bold">
        Chat with: <span className="text-blue-600">{friendId}</span>
      </h1>

      <div className="flex-1 border p-3 overflow-y-auto">
        {chatMessages.length === 0 ? (
          <p className="text-gray-500">No messages yet.</p>
        ) : (
          chatMessages.map((m, idx) => {
            const isMe = m.from === user?.user_id;
            return (
              <div
                key={idx}
                className={`mb-2 ${isMe ? "text-right text-blue-600" : "text-left text-gray-600"}`}
              >
                <strong>{isMe ? "Me" : friendId}:</strong> {m.message}
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="border p-2 flex-1"
          placeholder="Type a message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button variant="primary" onClick={handleSend}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatPage;
