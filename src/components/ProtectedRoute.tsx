import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem("token");

  // if no token goto login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // if exists show children
  return children;
};

export default ProtectedRoute;
