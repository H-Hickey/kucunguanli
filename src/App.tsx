import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthContext, usePermissions } from '@/contexts/authContext';
import { User } from '@/models/User';
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import StockIn from "@/pages/StockIn";
import StockOut from "@/pages/StockOut";
import Inventory, { InventoryProvider } from "@/pages/Inventory";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import BasicData from "@/pages/BasicData";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Empty } from "@/components/Empty";

// Create protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedAuth = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(savedAuth === 'true');
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><i class="fa-solid fa-spinner fa-spin text-blue-600 text-2xl"></i></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { hasPermission } = usePermissions(currentUser);

  useEffect(() => {
    // Check initial auth state from localStorage
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedUser = localStorage.getItem('currentUser');
    
    setIsAuthenticated(savedAuth === 'true');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (user: User) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.setItem('isAuthenticated', 'false');
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, currentUser, setIsAuthenticated: login, logout, hasPermission }}
    >
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Protected routes */}
           <Route element={<ProtectedRoute><InventoryProvider><DashboardLayout /></InventoryProvider></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
             <Route path="/basic-data" element={<BasicData />} />
             <Route path="/stock-in" element={<StockIn />} />
            <Route path="/stock-out" element={<StockOut />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/users" element={<Users />} />

          </Route>
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
