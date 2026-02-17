import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";

interface NavigationProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

export const Navigation = ({ isLoggedIn, onLogout }: NavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Admin navigation
  if (isLoggedIn) {
    return (
      <nav className="sticky top-0 z-50 h-[72px] w-full bg-white border-b border-gray-100 px-4 md:px-8 flex items-center justify-between shadow-sm">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/admin")}>
          <div className="bg-primary text-white p-1.5 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">church</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Harborside</h1>
        </div>

        {/* Center: Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-10 h-full">
          <button
            onClick={() => navigate("/admin")}
            className={`text-sm font-semibold transition-colors duration-200 ${
              location.pathname === "/admin" ? "nav-link-active" : "text-gray-500 hover:text-primary"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/analytics")}
            className={`text-sm font-semibold transition-colors duration-200 ${
              location.pathname === "/analytics" ? "nav-link-active" : "text-gray-500 hover:text-primary"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => navigate("/calendar")}
            className={`text-sm font-semibold transition-colors duration-200 ${
              location.pathname === "/calendar" ? "nav-link-active" : "text-gray-500 hover:text-primary"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => navigate("/tasks")}
            className={`text-sm font-semibold transition-colors duration-200 ${
              location.pathname === "/tasks" ? "nav-link-active" : "text-gray-500 hover:text-primary"
            }`}
          >
            Tasks
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">description</span>
            <span className="hidden lg:inline">Public Form</span>
          </button>

          <div className="h-8 w-[1px] bg-gray-100 mx-1 hidden sm:block" />

          {/* Mobile nav icons */}
          <div className="flex md:hidden items-center gap-1">
            <Button size="sm" variant={location.pathname === "/admin" ? "default" : "ghost"} onClick={() => navigate("/admin")} className="h-9 w-9 p-0">
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
            </Button>
            <Button size="sm" variant={location.pathname === "/analytics" ? "default" : "ghost"} onClick={() => navigate("/analytics")} className="h-9 w-9 p-0">
              <span className="material-symbols-outlined text-[20px]">bar_chart</span>
            </Button>
            <Button size="sm" variant={location.pathname === "/calendar" ? "default" : "ghost"} onClick={() => navigate("/calendar")} className="h-9 w-9 p-0">
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </Button>
            <Button size="sm" variant={location.pathname === "/tasks" ? "default" : "ghost"} onClick={() => navigate("/tasks")} className="h-9 w-9 p-0">
              <span className="material-symbols-outlined text-[20px]">checklist</span>
            </Button>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 p-1.5 pr-3 hover:bg-gray-50 rounded-full transition-all group"
          >
            <div className="size-9 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
            <span className="hidden sm:inline text-sm font-semibold text-gray-500 group-hover:text-gray-700">
              Logout
            </span>
          </button>
        </div>
      </nav>
    );
  }

  // Public navigation
  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-100 px-6 py-4 md:px-20 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
        <span className="material-symbols-outlined text-primary text-3xl font-bold">church</span>
        <h2 className="text-gray-900 text-xl font-extrabold leading-tight tracking-tight">Harborside</h2>
      </div>
      <div className="flex items-center gap-3">
        {location.pathname !== "/submit" && (
          <Button
            onClick={() => navigate("/submit")}
            className="primary-gradient text-white font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30"
          >
            <span className="material-symbols-outlined text-[20px] mr-2">add</span>
            <span className="hidden sm:inline">Submit Request</span>
            <span className="sm:hidden">Submit</span>
          </Button>
        )}
        {location.pathname !== "/" && (
          <Button variant="outline" onClick={() => navigate("/")} className="font-semibold">
            Check Status
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => navigate("/auth")}
          className="text-gray-500 font-semibold hover:text-primary"
        >
          <span className="material-symbols-outlined text-[20px] mr-1">login</span>
          <span className="hidden sm:inline">Admin</span>
        </Button>
      </div>
    </header>
  );
};
