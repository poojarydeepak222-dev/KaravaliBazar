import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MpinPage from "./pages/MpinPage";
import HomePage from "./pages/HomePage";
import GamePlayPage from "./pages/GamePlayPage";
import ChartPage from "./pages/ChartPage";
import ForumPage from "./pages/ForumPage";
import FundsPage from "./pages/FundsPage";
import ProfilePage from "./pages/ProfilePage";
import MyBidsPage from "./pages/MyBidsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminGames from "./pages/admin/AdminGames";
import AdminBids from "./pages/admin/AdminBids";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminForumSettings from "./pages/admin/AdminForumSettings";
import AdminChart from "./pages/admin/AdminChart";
import NotificationsPage from "./pages/NotificationsPage";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminLayout from "./pages/admin/AdminLayout";
import NotFound from "./pages/NotFound";
import PassbookPage from "./pages/PassbookPage";
import LandingPage from "./pages/LandingPage";
import ChartsListPage from "./pages/ChartsListPage";
import GameRatesPage from "./pages/GameRatesPage";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <HomePage /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/mpin" element={<MpinPage />} />
      <Route path="/game/:id/chart" element={<ChartPage />} />
      <Route path="/game/:id/play" element={<ProtectedRoute><GamePlayPage /></ProtectedRoute>} />
      <Route path="/forum" element={<ProtectedRoute><ForumPage /></ProtectedRoute>} />
      <Route path="/funds" element={<ProtectedRoute><FundsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/my-bids" element={<ProtectedRoute><MyBidsPage /></ProtectedRoute>} />
      <Route path="/passbook" element={<ProtectedRoute><PassbookPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/charts" element={<ChartsListPage />} />
      <Route path="/game-rates" element={<GameRatesPage />} />
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="games" element={<AdminGames />} />
        <Route path="bids" element={<AdminBids />} />
        <Route path="deposits" element={<AdminDeposits />} />
        <Route path="withdrawals" element={<AdminWithdrawals />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="forum-settings" element={<AdminForumSettings />} />
        <Route path="chart" element={<AdminChart />} />
        <Route path="notifications" element={<AdminNotifications />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/KaravaliBazar">
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
