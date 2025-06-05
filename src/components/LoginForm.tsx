import { useEffect, useState, FormEvent } from "react";
import { User } from "../types/User";

interface LoginFormProps {
  onLogin: (user: User) => void;
}

interface Outlet {
  id: string;
  name: string;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch available outlets when component mounts
    fetch("/api/outlets")
      .then((res) => res.json())
      .then((data) => {
        setOutlets(data);
        if (data.length > 0) {
          setSelectedOutletId(data[0].id); // default selection
        }
      })
      .catch((err) => console.error("Failed to fetch outlets", err));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, outletId: selectedOutletId }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      localStorage.setItem("token", data.token); // Save JWT for future use

      // Map OutletAccess to outletAccess: string[]
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
      alert(data.error || "Login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-700">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-8 rounded-2xl shadow-lg border-2 border-green-400 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Login to Poddo App
        </h2>
        <div className="mb-4">
          <label className="block text-green-200 mb-1 font-medium">
            Outlet
          </label>
          <select
            className="w-full border border-green-400 rounded-lg p-3 bg-gray-800 text-green-100 focus:outline-none"
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            required
          >
            <option value="">Select Outlet</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-green-200 mb-1 font-medium">
            Username
          </label>
          <input
            className="w-full border border-green-400 rounded-lg p-3 bg-gray-800 text-green-100 focus:outline-none"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="mb-6">
          <label className="block text-green-200 mb-1 font-medium">
            Password
          </label>
          <input
            className="w-full border border-green-400 rounded-lg p-3 bg-gray-800 text-green-100 focus:outline-none"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-400 to-green-200 text-green-800 font-bold py-3 rounded-lg hover:from-green-500 hover:to-green-300 hover:text-white transition cursor-pointer"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
