import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { SettingsProvider } from "@/contexts/SettingsContext";
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import ProjectsManagement from './pages/admin/ProjectsManagement';
import CategoriesManagement from './pages/admin/CategoriesManagement';
import Projects from './pages/Projects';
import About from './pages/About';
import Contact from './pages/Contact';
import { useAuth, checkAuthStatus } from './hooks/useAuth';
import Blog from './pages/Blog';
import BlogManagement from "./pages/admin/BlogManagement";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

function App() {
  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedAdminRoute>
                      <AdminDashboard />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/projects"
                  element={
                    <ProtectedAdminRoute>
                      <ProjectsManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/categories"
                  element={
                    <ProtectedAdminRoute>
                      <CategoriesManagement />
                    </ProtectedAdminRoute>
                  }
                />
                <Route path="/admin/blog" element={<BlogManagement />} />

              </Routes>
            </main>
            <Toaster />
          </div>
        </Router>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;