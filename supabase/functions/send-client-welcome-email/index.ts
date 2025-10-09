import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  clientName: string;
  clientEmail: string;
  password: string;
  portalUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, password, portalUrl }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${clientEmail}`);

    const emailResponse = await resend.emails.send({
      from: "Client Portal <onboarding@resend.dev>",
      to: [clientEmail],
      subject: "Welcome to Your Client Portal",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .credential-item { margin: 10px 0; }
              .label { font-weight: bold; color: #667eea; }
              .value { font-family: monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 5px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Welcome to Your Client Portal</h1>
              </div>
              <div class="content">
                <p>Hello ${clientName},</p>
                <p>Your client portal account has been created! You can now access your projects, tasks, and invoices online.</p>
                
                <div class="credentials">
                  <h3 style="margin-top: 0;">Your Login Credentials</h3>
                  <div class="credential-item">
                    <div class="label">Email:</div>
                    <div class="value">${clientEmail}</div>
                  </div>
                  <div class="credential-item">
                    <div class="label">Password:</div>
                    <div class="value">${password}</div>
                  </div>
                </div>
                
                <p><strong>Important:</strong> Please keep these credentials secure and change your password after your first login.</p>
                
                <a href="${portalUrl}" class="button">Access Client Portal</a>
                
                <div class="footer">
                  <p>If you have any questions, please don't hesitate to contact us.</p>
                  <p style="font-size: 12px; margin-top: 20px;">This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
