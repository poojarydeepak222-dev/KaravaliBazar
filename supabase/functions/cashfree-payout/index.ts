import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Cashfree Payouts V2 - Production
const PAYOUT_BASE = 'https://api.cashfree.com/payout';
const CF_API_VERSION = '2024-01-01';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const {
      withdrawal_id, user_id, amount,
      account_number, ifsc_code, account_holder, user_mobile,
    } = await req.json();

    const appId = Deno.env.get('CASHFREE_APP_ID')?.trim();
    const secretKey = Deno.env.get('CASHFREE_SECRET_KEY')?.trim();

    console.log('CF Payout AppID length:', appId?.length, 'SecretKey length:', secretKey?.length);

    if (!appId || !secretKey) {
      return new Response(JSON.stringify({ error: 'Cashfree credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const transferId = `KB_WD_${withdrawal_id.slice(0, 8)}_${Date.now()}`;
    const amtNum = parseFloat(String(amount));

    // Cashfree Payouts V2: Direct bank transfer
    const beneficiaryId = `BENE_${user_id.replace(/-/g, '').slice(0, 14)}`;

    const payoutPayload = {
      transfer_id: transferId,
      transfer_amount: amtNum,
      transfer_currency: 'INR',
      transfer_mode: 'banktransfer',
      beneficiary_details: {
        beneficiary_id: beneficiaryId,
        beneficiary_name: account_holder || 'User',
        beneficiary_email: `user_${(user_mobile || '9999').slice(-4)}@karavalibazar.com`,
        beneficiary_phone: user_mobile || '9999999999',
        bank_account_number: account_number,
        bank_ifsc: ifsc_code,
      },
    };

    console.log('Creating CF payout:', transferId, 'amount:', amtNum);

    const transferRes = await fetch(`${PAYOUT_BASE}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CF_API_VERSION,
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify(payoutPayload),
    });

    const transferText = await transferRes.text();
    console.log('CF payout transfer status:', transferRes.status, 'body:', transferText);

    let transferData: any;
    try { transferData = JSON.parse(transferText); } catch { transferData = {}; }

    // Mark withdrawal based on response
    if (transferRes.ok && (
      transferData.transfer_status === 'SUCCESS' ||
      transferData.transfer_status === 'RECEIVED' ||
      transferData.transfer_utr
    )) {
      await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawal_id);
      const { data: ud } = await supabase.from('app_users').select('total_withdrawn').eq('id', user_id).single();
      if (ud) {
        await supabase.from('app_users').update({
          total_withdrawn: (ud.total_withdrawn || 0) + amtNum,
        }).eq('id', user_id);
      }
      return new Response(JSON.stringify({
        success: true,
        utr: transferData.transfer_utr || transferId,
        transfer_id: transferId,
        status: transferData.transfer_status,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Queued / Pending — not an error, just needs processing time
    const isPending = transferRes.ok && (
      transferData.transfer_status === 'PENDING' ||
      transferData.transfer_status === 'INITIATED'
    );

    if (isPending) {
      await supabase.from('withdrawals').update({ status: 'pending' }).eq('id', withdrawal_id);
      return new Response(JSON.stringify({
        success: false,
        queued: true,
        transfer_id: transferId,
        status: transferData.transfer_status,
        message: 'Payout initiated, will process shortly',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Auth or validation failure — mark as pending for manual review
    const errMsg = transferData.message || transferData.error || JSON.stringify(transferData);
    console.error('CF payout failed:', errMsg);
    await supabase.from('withdrawals').update({ status: 'pending' }).eq('id', withdrawal_id);
    return new Response(JSON.stringify({
      success: false,
      queued: true,
      error: `CF Payout: ${errMsg}`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('cashfree-payout error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
