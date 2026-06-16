import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PrivacyPage from "./pages/PrivacyPage";
import DashboardPage from "./pages/DashboardPage";
import TrendPage from "./pages/TrendPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import { MonitoringProvider } from "./context/MonitoringContext";

function App() {
  return (
    <BrowserRouter>
      <MonitoringProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/ai-assistant"
            element={(
              <PlaceholderPage
                eyebrow="AI Assistant"
                title="Metric coach"
                description="A lightweight assistant space for explaining your current eye-care metrics and next steps."
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
              />
            )}
          />
          <Route path="/trend" element={<TrendPage />} />
          <Route
            path="/settings"
            element={(
              <PlaceholderPage
                eyebrow="Settings"
                title="VisionGuard settings"
                description="Local MVP settings will live here, including notification and privacy preferences."
              />
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MonitoringProvider>
    </BrowserRouter>
  );
}

export default App;
