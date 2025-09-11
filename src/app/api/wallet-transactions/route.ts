import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@submodule/utils/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  console.log('[DEBUG] Alchemy API Key:', alchemyApiKey);
  console.log('[DEBUG] Fetching transaction history for address:', address);

  if (!alchemyApiKey) {
    return NextResponse.json({ error: 'Alchemy API key not set' }, { status: 500 });
  }

  try {
    const url = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
    const body = {
      id: 1,
      jsonrpc: "2.0",
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: "0x0",
        toAddress: address,
        category: [
          "external",
          "internal",
          "erc20",
          "erc721",
          "erc1155"
        ],
        maxCount: "0x32",
        order: "desc"
      }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    const transfers = data.result.transfers;

    // Log the full transactions API response
    console.log('[Alchemy API Response - transfers]:', JSON.stringify(transfers, null, 2));

    // Cache in Supabase if wallet row exists
    const supabase = createClient();
    const { data: walletRow } = await supabase
      .from('user_wallets')
      .select('id')
      .eq('public_key', address)
      .maybeSingle();
    if (walletRow && walletRow.id) {
      const { error: updateError } = await supabase
        .from('user_wallets')
        .update({ wallet_transactions: transfers })
        .eq('public_key', address);
      if (updateError) {
        console.error('[Supabase] Failed to update wallet_transactions:', updateError);
      } else {
        console.log('[Supabase] wallet_transactions updated for', address);
      }
    } else {
      console.log('[Supabase] No wallet row found for', address, '- skipping cache');
    }

    return NextResponse.json({ result: transfers });
  } catch (e: any) {
    console.error('[ERROR] Failed to fetch transaction history:', e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
} 