import { NextRequest, NextResponse } from 'next/server';
import Moralis from 'moralis';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  const chain = searchParams.get('chain');
  const chainName = searchParams.get('chainName'); // Get the chain name for non-EVM chains

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  // Handle non-EVM chains (Solana, Bitcoin)
  if (chainName === 'solana' || chainName === 'bitcoin') {
    // For non-EVM chains, return a placeholder response for now
    // In a real implementation, you would integrate with Solana or Bitcoin APIs
    return NextResponse.json({
      total_networth_usd: 0,
      chains: [{
        chain: chainName,
        chain_id: chainName === 'solana' ? 'solana' : 'bitcoin',
        quote_currency: 'USD',
        items: [],
        total_quote: 0
      }]
    });
  }
  
  // Continue with EVM chain handling
  if (!chain) {
    return NextResponse.json({ error: 'Missing chain parameter for EVM chain' }, { status: 400 });
  }

  const apiKey = process.env.MORALIS_API_KEY;
  console.log('Moralis API Key:', apiKey, apiKey?.length);
  if (!apiKey) {
    return NextResponse.json({ error: 'Moralis API key not set' }, { status: 500 });
  }

  try {
    if (!Moralis.Core.isStarted) {
      await Moralis.start({ apiKey });
    }
    const response = await Moralis.EvmApi.wallets.getWalletNetWorth({
      address,
      chains: [chain],
      excludeSpam: true,
      excludeUnverifiedContracts: true,
      maxTokenInactivity: 1,
    });
    return NextResponse.json(response.raw);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
} 