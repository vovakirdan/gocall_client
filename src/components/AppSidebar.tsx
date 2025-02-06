import React from "react";
import { Home, Users, Video, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();

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
    </aside>
  );
};

export default AppSidebar;