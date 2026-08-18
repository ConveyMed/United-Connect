// Shared branded email shell. Every ConveyMed app uses this; branding arrives in
// the request payload (app_name, brand_dark, brand_light) so it travels with the
// app when the template is duplicated. Nothing lives in the Supabase dashboard.
//
// All styles are inlined on purpose - Gmail and Outlook strip <style> blocks.

export interface Brand {
  app_name?: string;
  brand_dark?: string;
  brand_light?: string;
  app_url?: string;
}

export const DEFAULTS = {
  app_name: "ConveyMed",
  brand_dark: "#1e40af",
  brand_light: "#3b82f6",
};

export function shell(opts: {
  heading: string;
  body: string;
  footer: string;
  brand: Brand;
}) {
  const app = opts.brand.app_name || DEFAULTS.app_name;
  const dark = opts.brand.brand_dark || DEFAULTS.brand_dark;
  const light = opts.brand.brand_light || DEFAULTS.brand_light;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1e293b;">
  <div style="padding:40px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;width:100%;">
      <tr><td style="background:linear-gradient(135deg,${dark} 0%,${light} 100%);color:#ffffff;padding:40px 30px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;">${opts.heading}</h1>
      </td></tr>
      <tr><td style="background:#ffffff;padding:40px 30px;border:1px solid #e2e8f0;border-top:none;">
${opts.body}
      </td></tr>
      <tr><td style="text-align:center;padding:20px 30px;color:#64748b;font-size:12px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 6px 0;font-weight:600;color:#475569;">${app}</p>
${opts.footer}
      </td></tr>
    </table>
  </div>
</body>
</html>`;
}

export function button(url: string, label: string, dark: string) {
  return `        <div style="text-align:center;margin:28px 0;">
          <a href="${url}" style="display:inline-block;background:${dark};color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">${label}</a>
        </div>`;
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function sendViaResend(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
  apiKey: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}
