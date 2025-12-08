import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginSignupPage from "./pages/LoginSignupPage";
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
import { WebSocketProvider, useWebSocketContext } from "./context/WebSocketContext";
import { CallProvider } from "./context/CallContext";
import {
  IncomingCallModal,
  OutgoingCallModal,
  ActiveCallView,
} from "./components/Call";
import ChatPage from "./pages/ChatPage";

// Inner component that has access to WebSocket context
const AppWithCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { wirechatClient } = useWebSocketContext();

  return (
    <CallProvider wirechatClient={wirechatClient}>
      {children}
      {/* Global call modals - shown on any page */}
      <IncomingCallModal />
      <OutgoingCallModal />
      <ActiveCallView />
    </CallProvider>
  );
};

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
      checkAPI();
    }, apiAvailable ? 60000 : 10000);

    return () => clearInterval(interval);
  }, []);

  if (apiAvailable === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-800">
        <h1 className="text-xl font-semibold mt-4 text-blue-600">Checking API Status...</h1>
        <p className="text-gray-600">Please wait while we check the server availability.</p>
        <Loader />
      </div>
    );
  }

  if (apiAvailable === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Server Unavailable</h1>
          <p className="text-lg mb-2">The application cannot connect to the backend server.</p>
          <p className="text-gray-600 mb-4">
            Please check if the API is running and try again. The system will retry automatically.
          </p>
        </div>
        <Loader />
      </div>
    );
  }

  return (
    <AuthProvider>
      <WebSocketProvider>
        <AppWithCallProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginSignupPage />} />
              {/* Protected routes inside common Layout */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/home" element={<Index />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/room/:roomID" element={<RoomPage />} />
                <Route path="/chat/:friendId" element={<ChatPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<Navigate to="/home" />} />
              </Route>
            </Routes>
          </Router>
        </AppWithCallProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
