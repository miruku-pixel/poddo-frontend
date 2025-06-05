import { useEffect, useState } from "react";
import { User } from "../types/User";
import { Link, useLocation } from "react-router-dom";
import LOGO from "../assets/LOGO_PODDO.png";
import { FaChevronRight } from "react-icons/fa"; // or use any icon

// Add userRole to ReportsDropdownProps
type ReportsDropdownProps = {
  userRole: string; // Expecting the user's role string (e.g., "WAITER", "CASHIER", "ADMIN")
};

export function ReportsDropdown({ userRole }: ReportsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  if (userRole === "WAITER") {
    return null;
  }

  const isReportsButtonActive = isOpen;

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition ${
          isReportsButtonActive
            ? "border-2 border-green-400 bg-gray-700 font-bold shadow-lg" // Bolder border when active
            : "border border-green-400 bg-gray-800 hover:bg-gray-700" // Default/hover state
        }`}
      >
        Reports
        <FaChevronRight className="transition-transform duration-300 group-hover:translate-x-1" />
      </button>

      {/* Dropdown Menu */}
      <div
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`absolute z-10 mt-2 w-56 origin-top-left rounded-md shadow-lg bg-gray-900 border border-green-400 transition-all duration-300 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        {/* Report 1 */}
        <Link
          to="/salessummary"
          className={`block px-4 py-2 rounded-lg transition m-2 ${
            // Kept m-2 for internal spacing of links
            location.pathname === "/salessummary"
              ? "border-2 border-green-400 bg-gray-700 font-bold text-white shadow-lg" // Bolder border when active
              : "border border-green-400 bg-gray-800 text-white hover:bg-gray-700" // Default/hover state
          }`}
        >
          Sales Report Summary
        </Link>

        {/* Report 2 */}
        <Link
          to="/salesdetail"
          className={`block px-4 py-2 rounded-lg transition m-2 ${
            // Kept m-2 for internal spacing of links
            location.pathname === "/salesdetail"
              ? "border-2 border-green-400 bg-gray-700 font-bold text-white shadow-lg" // Bolder border when active
              : "border border-green-400 bg-gray-800 text-white hover:bg-gray-700" // Default/hover state
          }`}
        >
          Sales Report in detail
        </Link>
      </div>
    </div>
  );
}

type NavbarProps = {
  // Renamed from 'Props' to 'NavbarProps' for clarity
  user: User;
  onLogout: () => void;
};

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Main Navbar wrapper: Consistent border and background */}
      <div className="border border-green-400 bg-gray-700 rounded-xl mb-4 p-[2px]">
        <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl shadow">
          <div>
            <p className="font-bold text-lg text-white">
              User: {user.username}
            </p>
            <p className="text-sm text-green-300">
              Outlet: {user.outlet || "N/A"}
            </p>
            <p className="text-sm text-green-300">{currentTime}</p>
          </div>
          <div className="flex-1 flex justify-center">
            <img src={LOGO} alt="Logo" className="h-20 object-contain" />{" "}
            {/* Used placeholder */}
          </div>
          <div>
            <button
              onClick={onLogout}
              // Logout button: Consistent border and background
              className="bg-gray-700 border border-green-400 text-white font-bold px-4 py-2 rounded hover:bg-gray-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      {/* Navigation Links Below Navbar */}
      <div className="flex gap-4">
        {/* Order Entry Link: Consistent border and background. Bold border when active. */}
        <Link
          to="/order"
          className={`block px-4 py-2 rounded-lg transition ${
            location.pathname === "/order"
              ? "border-2 border-green-400 bg-gray-700 font-bold text-white shadow-lg" // Bolder border when active
              : "border border-green-400 bg-gray-800 text-white hover:bg-gray-700" // Default/hover state
          }`}
        >
          Order Entry
        </Link>
        {/* Status Link: Consistent border and background. Bold border when active. */}
        <Link
          to="/status"
          className={`block px-4 py-2 rounded-lg transition ${
            location.pathname === "/status"
              ? "border-2 border-green-400 bg-gray-700 font-bold text-white shadow-lg" // Bolder border when active
              : "border border-green-400 bg-gray-800 text-white hover:bg-gray-700" // Default/hover state
          }`}
        >
          Status
        </Link>
        {/* Reports Dropdown Link: Removed outer p-[2px] wrapper. ReportsDropdown component handles its own styling. */}
        <ReportsDropdown userRole={user.role} />
      </div>
    </>
  );
}
