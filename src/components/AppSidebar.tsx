import React from "react";
import { Home, Users, Video, Settings } from "lucide-react";

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
  return (
    <aside className="w-64 bg-gray-200 p-4">
      <h2 className="text-xl font-bold mb-4">Menu</h2>
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