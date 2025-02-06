import React, { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useWebSocketContext } from "../../context/WebSocketContext";
import { Friend } from "../../types";
import Button from "../Button";

/**
 * Props for the ChatSidebar
 * @param {Friend[]} friends - array of friends
 */
interface ChatSidebarProps {
  friends: Friend[];
}

/**
 * Minimal ChatSidebar that stays visible on the side.
 * Renders a list of friends to pick from, displays the conversation,
 * and allows sending messages to the selected friend.
 */
const ChatSidebar: React.FC<ChatSidebarProps> = ({ friends }) => {
  const { user } = useAuth();
  const { messages, sendMessage } = useWebSocketContext();

  // Keep track of which friend is currently selected
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  // Local state for the message input
  const [inputMessage, setInputMessage] = useState<string>("");

  // Filter messages to show only those between me and the selected friend
  const filteredMessages = useMemo(() => {
    if (!selectedFriend || !user) return [];
    return messages.filter(
      (msg) =>
        (msg.from === user.user_id && msg.to === selectedFriend.user_id) ||
        (msg.from === selectedFriend.user_id && msg.to === user.user_id)
    );
  }, [messages, selectedFriend, user]);

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    setInputMessage("");
  };

  const handleSend = () => {
    if (!selectedFriend || !inputMessage.trim()) return;
    sendMessage(selectedFriend.user_id, inputMessage.trim());
    setInputMessage("");
  };

  return (
    <div className="flex flex-row border h-screen">
      {/* Left side: friend list */}
      <div className="w-1/3 border-r p-2">
        <h2 className="font-bold mb-2">Friends</h2>
        <ul>
          {friends.map((fr) => (
            <li key={fr.user_id} className="mb-1">
              <button
                onClick={() => handleSelectFriend(fr)}
                className={`block w-full text-left px-3 py-1 rounded ${
                  selectedFriend?.user_id === fr.user_id
                    ? "bg-blue-200"
                    : "hover:bg-blue-50"
                }`}
              >
                {fr.username}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right side: conversation */}
      <div className="w-2/3 p-2 flex flex-col">
        {!selectedFriend ? (
          <div className="text-gray-500">No friend selected</div>
        ) : (
          <>
            <div className="flex-1 border p-2 mb-2 overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <p className="text-gray-500">No messages yet.</p>
              ) : (
                filteredMessages.map((msg, index) => {
                  const isMe = msg.from === user?.user_id;
                  return (
                    <div
                      key={index}
                      className={`mb-1 ${
                        isMe ? "text-right text-blue-600" : "text-left text-gray-600"
                      }`}
                    >
                      <span>
                        <strong>{isMe ? "Me" : selectedFriend.username}:</strong> {msg.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                className="border flex-1 p-2 mr-2"
                placeholder="Type your message..."
              />
              <Button variant="primary" onClick={handleSend}>
                Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
