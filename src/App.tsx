import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import OrderEntry from "./pages/OrderEntryPage";
import StatusPage from "./pages/StatusPage";
import LoginPage from "./pages/LoginPage";
import { User } from "./types/User";
import BillingPageWrapper from "./pages/BillingPageWrapper";
import OrderEditPage from "./pages/OrderEditPage";
import AddItemToOrderPage from "./pages/AddItemToOrderPage";
import SalesReportPage from "./pages/SalesSummaryPage";
import SalesDetailPage from "./pages/SalesDetailPage";
import DailyRevenueReport from "./pages/DailyRevenueReport";

function App() {
  const [user, setUser] = useState<User | null>(null);

  // Restore user session on app load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Try to fetch user profile using the token
      fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.id) setUser(data);
          else setUser(null);
        })
        .catch(() => setUser(null));
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  if (!user) {
    return <LoginPage onLogin={handleLoginSuccess} />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/order"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <OrderEntry user={user} />
            </Layout>
          }
        />
        <Route
          path="/status"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <StatusPage user={user} />
            </Layout>
          }
        />
        <Route path="/" element={<Navigate to="/order" replace />} />
        <Route
          path="/billing/:orderId"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <BillingPageWrapper />
            </Layout>
          }
        />
        <Route
          path="/additem/:orderId"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <AddItemToOrderPage user={user} />
            </Layout>
          }
        />
        <Route
          path="/editorder/:orderId"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <OrderEditPage />
            </Layout>
          }
        />
        <Route
          path="/salessummary"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <SalesReportPage outletId={user?.outletId ?? ""} />
            </Layout>
          }
        />
        <Route
          path="/salesdetail"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <SalesDetailPage outletId={user?.outletId ?? ""} />
            </Layout>
          }
        />
        <Route
          path="/dailyrevenue"
          element={
            <Layout user={user} onLogout={handleLogout}>
              <DailyRevenueReport
                outletId={user?.outletId ?? ""}
                cashierName={user?.username ?? "N/A"}
                userRole={user?.role ?? "N/A"}
              />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
