import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWebSocketContext } from "../context/WebSocketContext";
import Button from "../components/Button";
import { getUserInfo } from "../services/api";

/**
 * A dedicated chat page that retrieves the :friendId param,
 * filters messages, and allows sending new messages.
 */
const ChatPage: React.FC = () => {
  const { friendId } = useParams(); // The URL param
  const { user, token } = useAuth();
  const { messages, sendMessage } = useWebSocketContext();

  const [inputMessage, setInputMessage] = useState<string>("");
  const [friendUsername, setFriendUsername] = useState<string>("");

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
    const fetchFriendUsername = async () => {
      if (token && friendId) {
        try {
          const userInfo = await getUserInfo(token, friendId);
          setFriendUsername(userInfo.username || "Unknown");
        } catch (error) {
          console.error("Failed to fetch user info:", error);
          setFriendUsername("Unknown");
        }
      }
    };

    fetchFriendUsername();
  }, [token, friendId]);

  return (
    <div className="p-4 flex flex-col gap-4 max-h-screen max-w-md mx-auto">
      <h1 className="text-2xl font-bold">
        Chat with: <span className="text-blue-600">{friendUsername}</span>
      </h1>

      <div className="flex-1 border p-3 overflow-y-auto max-h-screen">
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
                <strong>{isMe ? "Me" : friendUsername}:</strong> {m.message}
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
