import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WorkRequestForm } from "./components/WorkRequestForm";
import { AuthPage } from "./components/AuthPage";
import { Navigation } from "./components/Navigation";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';

// Lazy load admin-only routes for smaller initial bundle
const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AnalyticsPage = lazy(() => import("./components/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const CalendarPage = lazy(() => import("./components/CalendarPage").then(m => ({ default: m.CalendarPage })));
const PersonalTaskBoard = lazy(() => import("./components/PersonalTaskBoard").then(m => ({ default: m.PersonalTaskBoard })));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-[calc(100vh-73px)] flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
        <span className="material-symbols-outlined text-primary text-2xl">church</span>
      </div>
      <p className="text-gray-500 text-sm font-medium">Loading...</p>
    </div>
  </div>
);

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isAuthenticated = !!user && !!session;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation isLoggedIn={isAuthenticated} onLogout={handleLogout} />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/submit" element={<WorkRequestForm />} />
              <Route path="/auth" element={
                isAuthenticated ? <Navigate to="/admin" replace /> : <AuthPage onLogin={() => {}} />
              } />
              <Route path="/admin" element={
                isAuthenticated ? <AdminDashboard /> : <Navigate to="/auth" replace />
              } />
              <Route path="/analytics" element={
                isAuthenticated ? <AnalyticsPage /> : <Navigate to="/auth" replace />
              } />
              <Route path="/calendar" element={
                isAuthenticated ? <CalendarPage /> : <Navigate to="/auth" replace />
              } />
              <Route path="/tasks" element={
                isAuthenticated ? <PersonalTaskBoard /> : <Navigate to="/auth" replace />
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
