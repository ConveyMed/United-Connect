// Branded password reset. Called by the app instead of
// supabase.auth.resetPasswordForEmail, so branding lives in code and travels
// with the app when it is duplicated. Nothing to configure in the dashboard.
//
// Required project secret: RESEND_API_KEY
// Optional project secret: FROM_EMAIL (defaults to the app_name in the payload)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shell, button, cors, sendViaResend, DEFAULTS, Brand } from "../_emailShell.ts";

interface ResetRequest extends Brand {
  email: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const p: ResetRequest = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase configuration missing");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    if (!p.email) throw new Error("Email address required");

    const app = p.app_name || DEFAULTS.app_name;
    const dark = p.brand_dark || DEFAULTS.brand_dark;
    const from = Deno.env.get("FROM_EMAIL") || `${app} <noreply@mysendz.com>`;
    const appUrl = p.app_url || Deno.env.get("APP_URL") || "";

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: p.email,
      options: { redirectTo: `${appUrl}/reset-password` },
    });

    // Never reveal whether an account exists.
    if (error || !data?.properties?.action_link) {
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email has been sent." }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const link = data.properties.action_link;

    const html = shell({
      heading: "Reset Your Password",
      brand: p,
      body: `        <p style="margin:0 0 16px 0;">Hi,</p>
        <p style="margin:0 0 16px 0;">We received a request to reset the password for your ${app} account.</p>
        <p style="margin:0 0 8px 0;">Click the button below to create a new password:</p>
${button(link, "Reset Password", dark)}
        <p style="margin:20px 0 0 0;font-size:12px;color:#64748b;word-break:break-all;">Or paste this link into your browser:<br/>${link}</p>
        <div style="height:1px;background:#e2e8f0;margin:30px 0;"></div>
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:20px;text-align:center;">
          <p style="margin:0 0 8px 0;color:#92400e;font-size:14px;"><strong>Didn't request this?</strong></p>
          <p style="margin:0;color:#92400e;font-size:14px;">You can safely ignore this email. Your password will not be changed.</p>
        </div>`,
      footer: `        <p style="margin:0 0 4px 0;">This link expires in 1 hour for security reasons.</p>
        <p style="margin:0;">This email was sent to ${p.email}</p>`,
    });

    const sent = await sendViaResend({
      from, to: p.email, subject: `Reset Your ${app} Password`, html, apiKey: RESEND_API_KEY,
    });

    return new Response(JSON.stringify({ success: true, resend_id: sent.id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-reset-email:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
