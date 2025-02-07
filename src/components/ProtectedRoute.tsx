import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { validateToken } from "../services/api";

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token, logout } = useAuth();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsAuthorized(false);
        return;
      }

      try {
        const isValid = await validateToken(token);
        if (isValid) {
          setIsAuthorized(true);
        } else {
          logout(); // Очищаем токен при невалидности
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Error validating token:", error);
        logout(); // При ошибке считаем, что токен недействителен
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, [token, logout]);

  if (isAuthorized === null) {
    return <div>Checking authorization...</div>;
  }

  if (!isAuthorized) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
