-- Fix search_path for existing functions
CREATE OR REPLACE FUNCTION get_overdue_invoices(user_uuid uuid)
RETURNS TABLE (
  invoice_id uuid,
  invoice_number text,
  client_name text,
  project_name text,
  days_overdue integer,
  total_amount numeric,
  due_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.invoice_number,
    c.name as client_name,
    p.name as project_name,
    (CURRENT_DATE - i.due_date)::integer as days_overdue,
    i.total_amount,
    i.due_date
  FROM invoices i
  JOIN projects p ON i.project_id = p.id
  JOIN clients c ON i.client_id = c.id
  WHERE i.user_id = user_uuid
    AND i.status = 'unpaid'
    AND i.due_date IS NOT NULL
    AND i.due_date < CURRENT_DATE
  ORDER BY (CURRENT_DATE - i.due_date) DESC;
$$;