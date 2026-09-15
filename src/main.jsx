import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { AccessProvider } from "./context/AccessContext.jsx";
import "./index.css";
import App from "./App.jsx";

function AccessGate({ children }) {
  const { user } = useAuth();
  return <AccessProvider user={user}>{children}</AccessProvider>;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <AccessGate>
          <App />
        </AccessGate>
      </AuthProvider>
    </SettingsProvider>
  </StrictMode>
);
