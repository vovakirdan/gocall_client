import React from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

// Layout рендерит всегда сайдбар слева и основной контент через Outlet
const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex">
      {/* Сайдбар всегда виден */}
      <AppSidebar />
      {/* Основной контент */}
      <div className="flex-1 overflow-auto p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
