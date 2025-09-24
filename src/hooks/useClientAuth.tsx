import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ClientAuthContextType {
  client: Client | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};

export const ClientAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('client_session_token');
    if (token) {
      verifySession(token);
    } else {
      setLoading(false);
    }
  }, []);

  const verifySession = async (token: string) => {
    try {
      const { data, error } = await supabase.rpc('verify_client_session', { token });
      
      if (error) throw error;
      
      const result = data as any;
      if (result?.success) {
        setClient(result.client);
      } else {
        localStorage.removeItem('client_session_token');
      }
    } catch (error) {
      console.error('Session verification error:', error);
      localStorage.removeItem('client_session_token');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('authenticate_client', {
        client_email: email,
        client_password: password
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        localStorage.setItem('client_session_token', result.session_token);
        setClient(result.client);
        toast.success('Signed in successfully');
        return { error: null };
      } else {
        return { error: result?.error || 'Authentication failed' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'An error occurred during sign in' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('client_session_token');
    setClient(null);
    toast.success('Signed out successfully');
  };

  return (
    <ClientAuthContext.Provider value={{ client, loading, signIn, signOut }}>
      {children}
    </ClientAuthContext.Provider>
  );
};