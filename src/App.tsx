import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { checkAPIStatus } from "./services/api";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    const checkAPI = async () => {
      const isAvailable = await checkAPIStatus();
      setApiAvailable(isAvailable);
    };

    checkAPI();
  }, []);

  if (!apiAvailable) {
    return (
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <h1>Server is unavailable</h1>
        <p>Please make sure the API is running and try again.</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* default to login */}
        <Route path="/" element={<Navigate to="/login" />} />
        {/* login */}
        <Route path="/login" element={<Login />} />
        {/* protected route */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
