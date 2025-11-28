import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Conversations from "./pages/Conversations";
import Leads from "./pages/Leads";
import LeadPool from "./pages/LeadPool";
import Pipeline from "./pages/Pipeline";
import Analytics from "./pages/Analytics";
import MessageTemplates from "./pages/TagTemplates";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="leads" element={<Leads />} />
            <Route path="lead-pool" element={<LeadPool />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="message-templates" element={<MessageTemplates />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
