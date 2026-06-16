import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PrivacyPage from "./pages/PrivacyPage";
import DashboardPage from "./pages/DashboardPage";
import TrendPage from "./pages/TrendPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import SettingsModal from "./components/SettingsModal";
import { MonitoringProvider } from "./context/MonitoringContext";

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);

  return (
    <BrowserRouter>
      <MonitoringProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/dashboard" element={<DashboardPage onOpenSettings={openSettings} />} />
          <Route
            path="/ai-assistant"
            element={(
              <PlaceholderPage
                eyebrow="AI Assistant"
                title="Metric coach"
                description="A lightweight assistant space for explaining your current eye-care metrics and next steps."
                onOpenSettings={openSettings}
              />
            )}
          />
          <Route
            path="/ai-report"
            element={(
              <PlaceholderPage
                eyebrow="AI Report"
                title="Structured eye-care report"
                description="A focused report area for summarizing sessions, risks, and practical suggestions."
                onOpenSettings={openSettings}
              />
            )}
          />
          <Route path="/trend" element={<TrendPage onOpenSettings={openSettings} />} />
          <Route path="/settings" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </MonitoringProvider>
    </BrowserRouter>
  );
}

export default App;
