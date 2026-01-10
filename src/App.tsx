import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CheckScore from "./pages/CheckScore";
import Payment from "./pages/Payment";
import CreditReport from "./pages/CreditReport";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminReports from "./pages/admin/AdminReports";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminSettings from "./pages/admin/AdminSettings";

// Partner Pages
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import PartnerRegister from "./pages/partner/PartnerRegister";
import PartnerGenerate from "./pages/partner/PartnerGenerate";
import PartnerClients from "./pages/partner/PartnerClients";
import PartnerReports from "./pages/partner/PartnerReports";
import PartnerWallet from "./pages/partner/PartnerWallet";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/check-score" element={<CheckScore />} />
            <Route path="/payment/:reportId" element={<Payment />} />
            <Route path="/report/:reportId" element={<CreditReport />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/partners" element={<AdminPartners />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/revenue" element={<AdminRevenue />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            
            {/* Partner Routes */}
            <Route path="/partner" element={<PartnerDashboard />} />
            <Route path="/partner/register" element={<PartnerRegister />} />
            <Route path="/partner/generate" element={<PartnerGenerate />} />
            <Route path="/partner/clients" element={<PartnerClients />} />
            <Route path="/partner/reports" element={<PartnerReports />} />
            <Route path="/partner/wallet" element={<PartnerWallet />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
