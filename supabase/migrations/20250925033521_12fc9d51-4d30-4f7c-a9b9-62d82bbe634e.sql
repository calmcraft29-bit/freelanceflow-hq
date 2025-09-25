-- Create messages table for client-freelancer communication
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('client', 'freelancer')),
  sender_id uuid NOT NULL, -- client_id or user_id depending on sender_type
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages - clients can only see messages for their projects
CREATE POLICY "Clients can view messages for their projects" 
ON public.messages 
FOR SELECT 
USING (
  project_id IN (
    SELECT p.id 
    FROM public.projects p
    JOIN public.clients c ON p.client_id = c.id
    WHERE c.email = current_setting('app.current_client_email', true)
  )
);

-- Freelancers can view messages for their projects
CREATE POLICY "Freelancers can view messages for their projects" 
ON public.messages 
FOR SELECT 
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

-- Clients can send messages for their projects
CREATE POLICY "Clients can send messages for their projects" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'client' AND
  project_id IN (
    SELECT p.id 
    FROM public.projects p
    JOIN public.clients c ON p.client_id = c.id
    WHERE c.email = current_setting('app.current_client_email', true)
  )
);

-- Freelancers can send messages for their projects
CREATE POLICY "Freelancers can send messages for their projects" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'freelancer' AND
  auth.uid() = sender_id AND
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

-- Clients can update read status for their messages
CREATE POLICY "Clients can update read status for their messages" 
ON public.messages 
FOR UPDATE 
USING (
  project_id IN (
    SELECT p.id 
    FROM public.projects p
    JOIN public.clients c ON p.client_id = c.id
    WHERE c.email = current_setting('app.current_client_email', true)
  )
);

-- Freelancers can update read status for their messages
CREATE POLICY "Freelancers can update read status for their messages" 
ON public.messages 
FOR UPDATE 
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create trigger for updated_at
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_messages_project_id ON public.messages(project_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);