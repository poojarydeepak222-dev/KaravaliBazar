import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const CASHFREE_BASE = 'https://sandbox.cashfree.com/pg';
const CF_API_VERSION = '2023-08-01';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { order_id, user_id } = await req.json();

    if (!order_id || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing order_id or user_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('CASHFREE_APP_ID')?.trim();
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY')?.trim();

    if (!appId || !secretKey) {
      return new Response(JSON.stringify({ error: 'Cashfree credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch order from Cashfree
    const res = await fetch(`${CASHFREE_BASE}/orders/${order_id}`, {
      method: 'GET',
      headers: {
        'x-api-version': CF_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
    });

    const resText = await res.text();
    console.log('CF verify order status:', res.status, 'body:', resText);

    let data: any;
    try { data = JSON.parse(resText); } catch { data = {}; }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (data.order_status === 'PAID') {
      // Find deposit record by order_id (stored in upi_ref)
      const { data: deposit } = await supabase
        .from('deposits')
        .select('*')
        .eq('upi_ref', order_id)
        .eq('user_id', user_id)
        .maybeSingle();

      if (!deposit) {
        return new Response(JSON.stringify({ success: false, status: 'NOT_FOUND' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (deposit.status === 'pending') {
        // Approve deposit and credit balance
        await supabase.from('deposits').update({ status: 'approved' }).eq('id', deposit.id);
        const { data: ud } = await supabase.from('app_users').select('balance, total_deposited').eq('id', user_id).single();
        if (ud) {
          await supabase.from('app_users').update({
            balance: ud.balance + deposit.amount,
            total_deposited: (ud.total_deposited || 0) + deposit.amount,
          }).eq('id', user_id);
        }
        console.log('Deposit approved:', deposit.id, 'amount:', deposit.amount);
        return new Response(JSON.stringify({ success: true, status: 'PAID', amount: deposit.amount }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Already processed
      return new Response(JSON.stringify({ success: true, status: 'PAID', already_processed: true, amount: deposit.amount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, status: data.order_status || 'UNKNOWN' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('cashfree-verify error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
