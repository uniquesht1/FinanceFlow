import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { FinanceProvider } from "./contexts/FinanceContext";
import { TimezoneProvider } from "./contexts/TimezoneContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Categories = lazy(() => import("./pages/Categories"));
const Settings = lazy(() => import("./pages/Settings"));
const Budgeting = lazy(() => import("./pages/Budgeting"));
const Budgets = lazy(() => import("./pages/Budgets"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const RecurringTransactions = lazy(() => import("./pages/RecurringTransactions"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const pageFallback = (
  <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <TimezoneProvider>
              <FinanceProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={pageFallback}>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
                      <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
                      <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
                      <Route path="/tracker" element={<ProtectedRoute><Budgeting /></ProtectedRoute>} />
                      <Route path="/budgeting" element={<ProtectedRoute><Budgeting /></ProtectedRoute>} />
                      <Route path="/recurring" element={<ProtectedRoute><RecurringTransactions /></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </FinanceProvider>
            </TimezoneProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
