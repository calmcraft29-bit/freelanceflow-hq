import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ClientAuthProvider } from "@/hooks/useClientAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Invoices from "./pages/Invoices";
import ClientAuth from "./pages/ClientAuth";
import ClientDashboard from "./pages/ClientDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ClientAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/tasks/:projectId" element={<Tasks />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/client-auth" element={<ClientAuth />} />
              <Route path="/client-portal" element={<ClientDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ClientAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
