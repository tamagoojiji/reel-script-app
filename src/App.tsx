import { Routes, Route } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import HomePage from "./pages/HomePage";
import ScriptEditorPage from "./pages/ScriptEditorPage";
import AIGeneratePage from "./pages/AIGeneratePage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor/:id" element={<ScriptEditorPage />} />
        <Route path="/ai" element={<AIGeneratePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
