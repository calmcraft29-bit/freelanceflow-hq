import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-accent to-secondary">
      <div className="text-center p-8">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-primary-foreground to-accent-foreground bg-clip-text text-transparent">
          FreelanceFlow
        </h1>
        <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
          The complete project management solution for freelancers. Track time, manage clients, and generate invoices with ease.
        </p>
        <div className="space-y-4">
          <div className="bg-card/10 backdrop-blur-sm rounded-lg p-6 border border-border/20">
            <h2 className="text-2xl font-semibold mb-4 text-card-foreground">Get Started Today</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of freelancers who trust FreelanceFlow to manage their business.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Sign Up Now
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/client-auth')}
                className="border-primary/20 text-card-foreground hover:bg-primary/10"
              >
                Client Portal
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
