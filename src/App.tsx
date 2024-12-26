import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { checkAPIStatus } from "./services/api";

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
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
