import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"
import { Window } from '@tauri-apps/api/window';

async function setWindowPosition() {
  const currentWindow = Window.getCurrent();
  await currentWindow.center();
}

// Call the function to set the window position
setWindowPosition();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // <React.StrictMode>
    <App />
  // {/* </React.StrictMode>, */}
);
