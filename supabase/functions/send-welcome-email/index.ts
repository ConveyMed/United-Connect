// Branded welcome email, sent after signup. Supabase will not send this itself -
// new users are auto-confirmed, so the "Confirm signup" email never fires and
// there is no built-in welcome event.
//
// Required project secret: RESEND_API_KEY
// Optional project secret: FROM_EMAIL (defaults to the app_name in the payload)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { shell, button, cors, sendViaResend, DEFAULTS, Brand } from "../_emailShell.ts";

interface WelcomeRequest extends Brand {
  email: string;
  name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const p: WelcomeRequest = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    if (!p.email) throw new Error("Email address required");

    const app = p.app_name || DEFAULTS.app_name;
    const dark = p.brand_dark || DEFAULTS.brand_dark;
    const from = Deno.env.get("FROM_EMAIL") || `${app} <noreply@mysendz.com>`;
    const appUrl = p.app_url || Deno.env.get("APP_URL") || "";
    const greeting = p.name ? `Hi ${p.name},` : "Hi,";

    const html = shell({
      heading: `Welcome to ${app}`,
      brand: p,
      body: `        <p style="margin:0 0 16px 0;">${greeting}</p>
        <p style="margin:0 0 16px 0;">Your ${app} account is ready. You're all set to sign in and get started.</p>
${appUrl ? button(appUrl, `Open ${app}`, dark) : ""}
        <div style="height:1px;background:#e2e8f0;margin:30px 0;"></div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;text-align:center;">
          <p style="margin:0 0 8px 0;color:#991b1b;font-size:14px;"><strong>Didn't create this account?</strong></p>
          <p style="margin:0 0 10px 0;color:#991b1b;font-size:14px;">Someone may have entered your email by mistake.</p>
          <a href="mailto:support@mysendz.com?subject=Unauthorized%20Account%20-%20${encodeURIComponent(p.email)}" style="color:#dc2626;font-weight:600;">Report this</a>
        </div>`,
      footer: `        <p style="margin:0;">This email was sent to ${p.email}</p>`,
    });

    const sent = await sendViaResend({
      from, to: p.email, subject: `Welcome to ${app}`, html, apiKey: RESEND_API_KEY,
    });

    return new Response(JSON.stringify({ success: true, resend_id: sent.id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-welcome-email:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
