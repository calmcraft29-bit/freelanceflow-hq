import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ClientForm from '@/components/ClientForm';
import { Search, Trash2, Mail, FileText, ArrowLeft, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Client {
  id: string;
  name: string;
  email: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetPasswordClient, setResetPasswordClient] = useState<Client | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateSecurePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const fetchClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching clients",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchClients();
  }, [user, navigate]);

  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.notes.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const handleDelete = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Client deleted",
        description: "Client has been deleted successfully.",
      });

      fetchClients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting client",
        description: error.message,
      });
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordClient || !newPassword) return;

    setResetting(true);
    try {
      const { error } = await supabase.rpc('set_client_password', {
        client_email: resetPasswordClient.email,
        new_password: newPassword,
        use_hash: false
      });

      if (error) throw error;

      toast({
        title: "Password reset",
        description: "Client password has been updated successfully.",
      });

      setResetPasswordClient(null);
      setNewPassword('');
      setShowNewPassword(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error resetting password",
        description: error.message,
      });
    }
    setResetting(false);
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(newPassword);
    toast({
      title: "Copied!",
      description: "Password copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          </div>
          <ClientForm onSuccess={fetchClients} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clients by name, email, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="space-y-4">
                <div className="text-muted-foreground">
                  {searchTerm ? 'No clients match your search.' : 'No clients yet.'}
                </div>
                {!searchTerm && (
                  <div>
                    <ClientForm onSuccess={fetchClients} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card key={client.id} className="relative">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Client
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {client.notes && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1 mb-2">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Notes</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {client.notes}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <ClientForm client={client} onSuccess={fetchClients} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setResetPasswordClient(client);
                          setNewPassword(generateSecurePassword());
                        }}
                      >
                        <Key className="w-4 h-4 mr-1" />
                        Reset Password
                      </Button>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Client</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{client.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(client.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredClients.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Showing {filteredClients.length} of {clients.length} clients
          </div>
        )}
      </main>

      <Dialog open={!!resetPasswordClient} onOpenChange={() => {
        setResetPasswordClient(null);
        setNewPassword('');
        setShowNewPassword(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Client Password</DialogTitle>
            <DialogDescription>
              Generate a new password for {resetPasswordClient?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyPassword}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setNewPassword(generateSecurePassword())}
            >
              Generate New Password
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordClient(null);
                setNewPassword('');
                setShowNewPassword(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting || !newPassword}>
              {resetting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;