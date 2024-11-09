import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      navigate('/admin');
    } else if (isAuthenticated) {
      navigate('/projects');
    }
  }, [isAuthenticated, isAdmin, navigate]);

  return null;
};

export default Index;