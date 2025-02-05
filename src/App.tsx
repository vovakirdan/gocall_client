import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginSignupPage from "./pages/LoginSignupPage";
// Заменяем Home на новый Index:
import Index from "./pages/Index";
import RoomPage from "./pages/RoomPage";
import FriendsPage from "./pages/FriendsPage";
import RoomsPage from "./pages/RoomsPage";
import { checkAPIStatus } from "./services/api";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { isDesktop } from "./utils/platform";
import SettingsPage from "./pages/SettingsPage";
import Loader from "./components/Loader";

function App() {
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    console.log(isDesktop() ? "I am desktop" : "I am browser");

    const checkAPI = async () => {
      const isAvailable = await checkAPIStatus();
      setApiAvailable(isAvailable);

      if (!isAvailable) {
        console.warn("API is unavailable. Retrying...");
      }
    };

    checkAPI();

    const interval = setInterval(() => {
      if (apiAvailable === false) {
        checkAPI();
      }
    }, 10000); // Проверяем API каждые 10 секунд

    return () => clearInterval(interval); // Очищаем интервал при размонтировании
  }, [apiAvailable]);

  if (apiAvailable === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-800">
        <Loader />
        <h1 className="text-xl font-semibold mt-4 text-blue-600">Checking API Status...</h1>
        <p className="text-gray-600">Please wait while we check the server availability.</p>
      </div>
    );
  }

  if (apiAvailable === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-800">
        <Loader />
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Server Unavailable</h1>
          <p className="text-lg mb-2">The application cannot connect to the backend server.</p>
          <p className="text-gray-600 mb-4">
            Please check if the API is running and try again. The system will retry automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginSignupPage />} />
          {/* Защищённые маршруты внутри общего Layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/home" element={<Index />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/room/:roomID" element={<RoomPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/" element={<Navigate to="/home" />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;