import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('auth header present:', !!authHeader);
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    console.log('user:', user?.id, 'authError:', authError?.message);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { edu_email, school } = await req.json();
    console.log('edu_email:', edu_email, 'school:', school);
    if (!edu_email || !school) {
      return new Response(JSON.stringify({ error: 'Missing edu_email or school' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('edu_verifications')
      .upsert(
        { user_id: user.id, edu_email, school, code, expires_at: expiresAt },
        { onConflict: 'user_id' },
      );
    console.log('dbError:', dbError?.message);
    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Rally <verify@rallywithus.net>',
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

    const resendBody = await emailRes.text();
    console.log('resend status:', emailRes.status, 'body:', resendBody);

    if (!emailRes.ok) {
      return new Response(JSON.stringify({ error: `Resend error: ${resendBody}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('unhandled error:', (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
