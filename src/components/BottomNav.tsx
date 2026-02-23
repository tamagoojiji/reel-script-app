import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", label: "ホーム", icon: "📋" },
  { path: "/ai", label: "AI生成", icon: "✨" },
  { path: "/settings", label: "設定", icon: "⚙️" },
] as const;

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 safe-bottom z-50">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active =
            tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center py-2 px-4 min-w-[64px] min-h-[48px] ${
                active ? "text-indigo-400" : "text-gray-500"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
