import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Cashfree PG Production base URL
const CASHFREE_BASE = 'https://api.cashfree.com/pg';
const CF_API_VERSION = '2023-08-01';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { user_id, amount, user_name, user_mobile } = body;

    if (!user_id || !amount || Number(amount) < 100) {
      return new Response(JSON.stringify({ error: 'Invalid input. Minimum deposit ₹100.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('CASHFREE_APP_ID')?.trim();
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY')?.trim();

    console.log('CF AppID length:', appId?.length, 'SecretKey length:', secretKey?.length);

    if (!appId || !secretKey) {
      return new Response(JSON.stringify({ error: 'Cashfree credentials not configured in secrets' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderId = `KB_DEP_${user_id.slice(0, 8)}_${Date.now()}`;
    const returnUrl = `${req.headers.get('origin') || 'https://karavalibazar.onspace.app'}/funds?payment_status=${orderId}`;

    const orderPayload = {
      order_id: orderId,
      order_amount: parseFloat(String(amount)),
      order_currency: 'INR',
      customer_details: {
        customer_id: `cust_${user_id.replace(/-/g, '').slice(0, 14)}`,
        customer_name: user_name || 'User',
        customer_phone: user_mobile || '9999999999',
        customer_email: `user_${(user_mobile || '9999').slice(-4)}@karavalibazar.com`,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: '',
      },
      order_note: 'Karavali Bazar Deposit',
    };

    console.log('Creating CF order:', orderId, 'amount:', amount, 'return_url:', returnUrl);

    const orderRes = await fetch(`${CASHFREE_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CF_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify(orderPayload),
    });

    const responseText = await orderRes.text();
    console.log('CF response status:', orderRes.status, 'body:', responseText);

    let orderData: any;
    try { orderData = JSON.parse(responseText); } catch { orderData = { message: responseText }; }

    if (!orderRes.ok || !orderData.payment_session_id) {
      return new Response(JSON.stringify({
        error: `Cashfree: ${orderData.message || orderData.error || JSON.stringify(orderData)}`,
        cf_status: orderRes.status,
        detail: orderData,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save pending deposit to DB
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('deposits').insert({
      user_id,
      user_name: user_name || 'User',
      user_mobile: user_mobile || '',
      amount: parseFloat(String(amount)),
      upi_ref: orderId,
      upi_id: 'cashfree_pg',
      status: 'pending',
    });

    return new Response(JSON.stringify({
      order_id: orderData.order_id,
      payment_session_id: orderData.payment_session_id,
      order_status: orderData.order_status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('cashfree-deposit error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
