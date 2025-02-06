import React, { useEffect, useState } from "react";
import { Home, Users, Video, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Friend } from "../types";
import { fetchPinnedFriends } from "../services/friends-api";
import { MessageCircle } from "lucide-react";

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
    loadPinned();
  }, [token]);

  const handlePinnedClick = (friend: Friend) => {
    console.log("Friend from pinned", friend)
    navigate(`/chat/${friend.user_id}`);
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
              <a
                href={item.url}
                className="flex items-center gap-2 hover:text-blue-500"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </a>
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
    </aside>
  );
};

export default AppSidebar;