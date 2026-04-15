import React, { useEffect, useState } from "react";
import { Home, Users, Video, Settings, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { ConversationInfo, Friend } from "../types";
import { fetchConversations } from "../services/conversations-api";
import { fetchPinnedFriends } from "../services/friends-api";

interface MenuItem {
  title: string;
  icon: React.FC<{ className?: string }>;
  url: string;
}

const menuItems: MenuItem[] = [
  { title: "Home", icon: Home, url: "/home" },
  { title: "Friends", icon: Users, url: "/friends" },
  { title: "Rooms", icon: Video, url: "/rooms" },
  { title: "Settings", icon: Settings, url: "/settings" },
];

const AppSidebar: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [pinned, setPinned] = useState<Friend[]>([]);
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);

  useEffect(() => {
    if (!token) return;
    const loadPinned = async () => {
      try {
        const pinnedList = await fetchPinnedFriends(token);
        setPinned(pinnedList);
      } catch (err) {
        console.error(err);
      }
    };

    const loadConversations = async () => {
      try {
        const conversationList = await fetchConversations(token);
        setConversations(conversationList);
      } catch (err) {
        console.error(err);
      }
    };

    void loadPinned();
    void loadConversations();
  }, [token]);

  const handlePinnedClick = (friend: Friend) => {
    navigate(`/chat/${friend.user_id}`, {
      state: { friendUsername: friend.username },
    });
  };

  const handleConversationClick = (conversation: ConversationInfo) => {
    navigate(`/chat/${conversation.user_id}`, {
      state: { friendUsername: conversation.username },
    });
  };

  return (
    <aside className="w-64 bg-gray-200 p-4 sticky top-0 h-screen">
      <h2 className="text-xl font-bold mb-4">Hello, {user ? user.username : "Guest"}!<br></br>
        <span className="text-x text-blue-600">
          Go call?
        </span>
      </h2>
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.title} className="mb-2">
              <Link
                to={item.url}
                className="flex items-center gap-2 hover:text-blue-500"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {pinned.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Pinned Friends</h3>
          <ul className="space-y-1">
            {pinned.map((fr) => (
              <li key={fr.id}>
                <div className="flex items-center justify-between w-full px-2 py-1 rounded hover:bg-blue-100">
                  <span>{fr.username}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handlePinnedClick(fr)} className="text-blue-500 hover:text-blue-700">
                      <MessageCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Messages</h3>
        {conversations.length === 0 ? (
          <p className="text-sm text-gray-500">No active chats yet.</p>
        ) : (
          <ul className="space-y-2">
            {conversations.map((conversation) => (
              <li key={conversation.user_id}>
                <button
                  type="button"
                  onClick={() => handleConversationClick(conversation)}
                  className="w-full text-left px-2 py-2 rounded hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{conversation.username}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(conversation.last_message_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.last_message}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
