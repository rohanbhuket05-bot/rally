import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Authenticate the calling user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing auth header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { edu_email, school } = await req.json();
    if (!edu_email || !school) throw new Error('Missing edu_email or school');

    // Generate a 6-digit code and store it (10-minute expiry)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('edu_verifications')
      .upsert(
        { user_id: user.id, edu_email, school, code, expires_at: expiresAt },
        { onConflict: 'user_id' },
      );
    if (dbError) throw dbError;

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rally <verify@rallywithus.app>',
        to: edu_email,
        subject: `${code} is your Rally verification code`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="margin:0 0 8px;font-size:24px">Verify your student status</h2>
            <p style="color:#666;margin:0 0 24px">Enter this code in Rally to confirm your ${school} email.</p>
            <div style="background:#f5f5ff;border-radius:12px;padding:24px;text-align:center;letter-spacing:0.3em;font-size:36px;font-weight:700;color:#534AB7">${code}</div>
            <p style="color:#999;font-size:13px;margin-top:20px">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const body = await emailRes.text();
      throw new Error(`Resend error: ${body}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
