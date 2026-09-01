import { useEffect, useState, useMemo, useRef, FormEvent } from "react";
import { User } from "../types/User";
import LOGO from "../assets/LOGO_PODDO.webp";
import {
  Store,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Check,
  MapPin,
} from "lucide-react";

interface LoginFormProps {
  onLogin: (user: User) => void;
}

interface Outlet {
  id: string;
  name: string;
  city?: string;
}

// Define the API_BASE_URL using import.meta.env
const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Helper for city-based color styling
const getCityTheme = (city?: string) => {
  const normalized = city?.trim().toLowerCase();
  if (normalized === "batam") {
    return {
      cityName: "Batam",
      badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      dot: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.7)]",
      itemActive: "bg-rose-500/15 border-rose-500/40 text-rose-100",
      itemHover: "hover:bg-rose-500/10 hover:border-rose-500/20",
      headerText: "text-rose-400",
    };
  }
  if (normalized === "manado") {
    return {
      cityName: "Manado",
      badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]",
      itemActive: "bg-emerald-500/15 border-emerald-500/40 text-emerald-100",
      itemHover: "hover:bg-emerald-500/10 hover:border-emerald-500/20",
      headerText: "text-emerald-400",
    };
  }
  if (normalized === "bali") {
    return {
      cityName: "Bali",
      badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]",
      itemActive: "bg-amber-500/15 border-amber-500/40 text-amber-100",
      itemHover: "hover:bg-amber-500/10 hover:border-amber-500/20",
      headerText: "text-amber-400",
    };
  }
  return {
    cityName: city || "Other",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]",
    itemActive: "bg-sky-500/15 border-sky-500/40 text-sky-100",
    itemHover: "hover:bg-sky-500/10 hover:border-sky-500/20",
    headerText: "text-sky-400",
  };
};

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Fetch available outlets when component mounts
    const fetchOutlets = async () => {
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/outlets`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.error || `Failed to fetch outlets: ${res.statusText}`
          );
        }
        const data: Outlet[] = await res.json();
        const getPriority = (city?: string) => {
          if (!city) return 4;
          const normalized = city.trim().toLowerCase();
          if (normalized === "batam") return 1;
          if (normalized === "manado") return 2;
          if (normalized === "bali") return 3;
          return 4;
        };
        const sortedData = [...data].sort((a, b) => {
          const pA = getPriority(a.city);
          const pB = getPriority(b.city);
          if (pA !== pB) {
            return pA - pB;
          }
          return a.name.localeCompare(b.name);
        });
        setOutlets(sortedData);
        if (sortedData.length > 0) {
          setSelectedOutletId((currentId) => currentId || sortedData[0].id);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch outlets", err);
        if (err instanceof Error) {
          setError(`Failed to load outlets: ${err.message}`);
        } else {
          setError("An unknown error occurred while loading outlets.");
        }
      }
    };

    fetchOutlets();
  }, []);

  // Group outlets by City (Batam -> Manado -> Bali -> Others)
  const groupedOutlets = useMemo(() => {
    const groups: {
      [key: string]: {
        key: string;
        priority: number;
        cityName: string;
        outlets: Outlet[];
      };
    } = {
      batam: { key: "batam", priority: 1, cityName: "Batam", outlets: [] },
      manado: { key: "manado", priority: 2, cityName: "Manado", outlets: [] },
      bali: { key: "bali", priority: 3, cityName: "Bali", outlets: [] },
      other: { key: "other", priority: 4, cityName: "Other Outlets", outlets: [] },
    };

    outlets.forEach((outlet) => {
      const norm = outlet.city?.trim().toLowerCase();
      if (norm === "batam") groups.batam.outlets.push(outlet);
      else if (norm === "manado") groups.manado.outlets.push(outlet);
      else if (norm === "bali") groups.bali.outlets.push(outlet);
      else groups.other.outlets.push(outlet);
    });

    return Object.values(groups)
      .filter((g) => g.outlets.length > 0)
      .sort((a, b) => a.priority - b.priority)
      .map((g) => ({
        ...g,
        outlets: [...g.outlets].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [outlets]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedOutletId) {
      setError("Please select an outlet to proceed.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          outletId: selectedOutletId,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        localStorage.setItem("token", data.token);

        type OutletAccessItem = { outletId: string };
        const outletAccess = Array.isArray(data.user.OutletAccess)
          ? data.user.OutletAccess.map((oa: OutletAccessItem) => oa.outletId)
          : [];

        onLogin({
          id: data.user.id,
          username: data.user.username,
          role: data.user.role,
          outletId: data.user.outletId,
          outlet: data.user.outlet,
          outletAccess,
        });
      } else {
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err: unknown) {
      console.error("Login failed:", err);
      if (err instanceof Error) {
        setError(`Login failed: ${err.message}`);
      } else {
        setError("An unknown error occurred during login.");
      }
      setLoading(false);
    }
  };

  const selectedOutlet = outlets.find((o) => o.id === selectedOutletId);
  const selectedCityTheme = getCityTheme(selectedOutlet?.city);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split Card Container */}
      <div className="relative w-full max-w-4xl bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/60 overflow-hidden grid grid-cols-1 md:grid-cols-12 transition-all duration-300">
        
        {/* Left Side: Brand & Logo Panel */}
        <div className="md:col-span-5 bg-gradient-to-b from-slate-900 via-slate-950 to-emerald-950/40 p-8 sm:p-10 flex flex-col justify-between items-center text-center relative border-b md:border-b-0 md:border-r border-slate-800/80">
          {/* Subtle top badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Point of Sales</span>
          </div>

          {/* Center Logo Display */}
          <div className="my-8 md:my-auto flex flex-col items-center">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-3xl blur-lg opacity-30 group-hover:opacity-60 transition duration-500" />
              <div className="relative p-4 bg-slate-900/80 rounded-2xl border border-slate-700/60 shadow-inner">
                <img
                  src={LOGO}
                  alt="Poddo Logo"
                  className="w-36 h-36 sm:w-44 sm:h-44 object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
            
            <h1 className="mt-6 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              PoDDo<span className="text-emerald-400">App</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-[220px]">
              Fast, reliable & seamless restaurant management system
            </p>
          </div>

          {/* Bottom Security / Trust Indicator */}
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400/80" />
            <span>Secure Enterprise Login</span>
          </div>
        </div>

        {/* Right Side: Login Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-slate-900/60">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="text-sm text-slate-400 mt-1.5">
              Sign in with your outlet credentials to start your session
            </p>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Custom Grouped Outlet Dropdown with City Highlights & Dividers */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Outlet Location
                </label>
                {selectedOutlet?.city && (
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${selectedCityTheme.badge}`}
                  >
                    ● {selectedOutlet.city}
                  </span>
                )}
              </div>

              {/* Dropdown Trigger Button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`w-full pl-3.5 pr-4 py-3 bg-slate-950/70 border rounded-xl text-left text-sm font-medium transition-all duration-200 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                  isDropdownOpen
                    ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/50"
                    : "border-slate-700/80 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  {selectedOutlet ? (
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-100 font-semibold truncate">
                        {selectedOutlet.name}
                      </span>
                      {selectedOutlet.city && (
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border shrink-0 ${selectedCityTheme.badge}`}
                        >
                          {selectedOutlet.city}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      -- Choose an Outlet --
                    </span>
                  )}
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isDropdownOpen ? "rotate-180 text-emerald-400" : ""
                  }`}
                />
              </button>

              {/* Grouped & Highlighted Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/80 max-h-72 overflow-y-auto z-50 p-2 space-y-3">
                  {groupedOutlets.map((group, groupIdx) => {
                    const theme = getCityTheme(group.cityName);

                    return (
                      <div key={group.key} className="space-y-1">
                        {/* Group Header with visible line & gap separator */}
                        <div
                          className={`flex items-center gap-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                            theme.headerText
                          } ${
                            groupIdx > 0
                              ? "pt-2.5 border-t border-slate-800"
                              : ""
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`}
                          />
                          <span className="shrink-0 flex items-center gap-1">
                            <MapPin className="w-3 h-3 inline-block opacity-80" />
                            {group.cityName}
                          </span>
                          <div className="flex-1 h-[1px] bg-slate-800" />
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full border shrink-0 ${theme.badge}`}
                          >
                            {group.outlets.length}{" "}
                            {group.outlets.length === 1 ? "outlet" : "outlets"}
                          </span>
                        </div>

                        {/* Outlet Items under this City */}
                        <div className="space-y-1 pt-0.5">
                          {group.outlets.map((outlet) => {
                            const isSelected = outlet.id === selectedOutletId;

                            return (
                              <button
                                key={outlet.id}
                                type="button"
                                onClick={() => {
                                  setSelectedOutletId(outlet.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors duration-150 flex items-center justify-between border cursor-pointer ${
                                  isSelected
                                    ? `${theme.itemActive} shadow-sm`
                                    : `border-transparent text-slate-300 ${theme.itemHover}`
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      isSelected
                                        ? theme.dot
                                        : "bg-slate-600"
                                    }`}
                                  />
                                  <span className="truncate">
                                    {outlet.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${theme.badge}`}
                                  >
                                    {group.cityName}
                                  </span>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <input
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-emerald-400" />
                </div>
                <input
                  className="w-full pl-10 pr-11 py-3 bg-slate-950/60 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition duration-200"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none transition cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full group relative flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 hover:from-emerald-400 hover:to-green-300 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Terminal</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Footer / Help Note */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-500">
              Need help accessing your terminal? Contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
