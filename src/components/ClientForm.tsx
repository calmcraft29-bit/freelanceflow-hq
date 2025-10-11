import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Copy, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Client {
  id?: string;
  name: string;
  email: string;
  notes: string;
}

interface ClientFormProps {
  client?: Client;
  onSuccess: () => void;
}

const ClientForm = ({ client, onSuccess }: ClientFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Client>({
    name: client?.name || '',
    email: client?.email || '',
    notes: client?.notes || '',
  });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateSecurePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Password copied to clipboard",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      if (client?.id) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update(formData)
          .eq('id', client.id)
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Client updated",
          description: "Client has been updated successfully.",
        });

        setOpen(false);
        onSuccess();
      } else {
        // Create new client with auto-generated credentials
        const password = generateSecurePassword();
        setGeneratedPassword(password);

        // Insert client
        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert([
            {
              ...formData,
              user_id: user.id,
              portal_access: true,
              is_active: true,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        // Set client password
        const { data: passwordData, error: passwordError } = await supabase.rpc(
          'set_client_password',
          {
            client_email: formData.email,
            new_password: password,
            use_hash: false
          }
        );

        if (passwordError) throw passwordError;

        // Send welcome email
        const portalUrl = `${window.location.origin}/client-auth`;
        const { error: emailError } = await supabase.functions.invoke(
          'send-client-welcome-email',
          {
            body: {
              clientName: formData.name,
              clientEmail: formData.email,
              password: password,
              portalUrl: portalUrl,
            },
          }
        );

        if (emailError) {
          console.error('Email error:', emailError);
          toast({
            title: "Client created",
            description: "Client created but email failed to send. Please share credentials manually.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Client created",
            description: "Welcome email sent with login credentials.",
          });
        }

        setShowCredentials(true);
        onSuccess();
        setFormData({ name: '', email: '', notes: '' });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }

    setLoading(false);
  };

  const handleClose = () => {
    setOpen(false);
    setShowCredentials(false);
    setGeneratedPassword('');
    setCopied(false);
    setShowPassword(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {client ? (
            <Button variant="outline" size="sm">
              Edit
            </Button>
          ) : (
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          
          {showCredentials ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Client account created successfully! Credentials have been emailed to the client.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-sm">Generated Credentials</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <div className="mt-1 p-2 bg-background rounded border text-sm font-mono">
                      {formData.email}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Password</Label>
                    <div className="mt-1 flex gap-2">
                      <div className="flex-1 p-2 bg-background rounded border text-sm font-mono flex items-center justify-between">
                        <span>{showPassword ? generatedPassword : '••••••••••••'}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                      >
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Save these credentials securely. The client will receive them via email.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this client..."
                  rows={3}
                />
              </div>
              
              {!client && (
                <Alert>
                  <AlertDescription className="text-xs">
                    A secure password will be auto-generated and emailed to the client with portal access instructions.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientForm;