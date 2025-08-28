import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache for multi price responses (short TTL)
const multiCache = new Map<string, { ts: number; data: any }>();

export const runtime = 'edge';


export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.BIRDEYE_API_KEY || process.env.NEXT_PUBLIC_BIRDEYE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({} as any));
    let { addresses } = body as { addresses?: string[] | string };

    if (!addresses) {
      const { searchParams } = new URL(request.url);
      const qs = searchParams.get('addresses') || '';
      if (qs) addresses = qs.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (typeof addresses === 'string') {
      addresses = addresses.split(',').map(s => s.trim()).filter(Boolean);
    }

    const list = Array.isArray(addresses) ? addresses : [];
    if (list.length === 0) {
      return NextResponse.json({ error: 'No addresses provided' }, { status: 400 });
    }

    // Basic Solana address validation to avoid 500s upstream on bad input
    const solanaAddrRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const tokens = Array.from(new Set(list.filter(a => solanaAddrRegex.test(a))));

    const now = Date.now();
    const ttlMs = 15000; // 15s cache
    const results: Record<string, any> = {};
    const toFetch: string[] = [];

    for (const t of tokens) {
      const cached = multiCache.get(t);
      if (cached && now - cached.ts < ttlMs) {
        results[t] = cached.data;
      } else {
        toFetch.push(t);
      }
    }

    if (toFetch.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < toFetch.length; i += 100) {
        chunks.push(toFetch.slice(i, i + 100));
      }

      const runChunk = async (chunk: string[]) => {
        const resp = await fetch('https://public-api.birdeye.so/defi/multi_price', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-chain': 'solana',
            'X-API-KEY': apiKey,
            'User-Agent': 'Mozilla/5.0 (compatible; Stockline/1.0)'
          },
          body: JSON.stringify({ list_address: chunk.join(',') })
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          console.error(`Birdeye multi_price error ${resp.status}: ${errText}`);
          // Fill chunk with nulls to avoid failing entire request
          for (const addr of chunk) {
            results[addr] = null as any;
            multiCache.set(addr, { ts: now, data: null });
          }
          return;
        }

        const raw = await resp.json().catch(err => {
          console.error('Failed to parse Birdeye response JSON:', err);
          return null as any;
        });
        const payload = (raw && typeof raw === 'object' && 'data' in raw) ? (raw as any).data : raw;
        for (const [addr, val] of Object.entries<any>(payload || {})) {
          // Normalize to { success: true, data: {...} } so clients can rely on same shape
          const normalized = (val && typeof val === 'object' && 'data' in val)
            ? { success: true, data: (val as any).data }
            : { success: true, data: val };
          results[addr] = normalized;
          multiCache.set(addr, { ts: now, data: normalized });
        }

        for (const addr of chunk) {
          if (!results[addr]) {
            const placeholder = null as any;
            results[addr] = placeholder;
            multiCache.set(addr, { ts: now, data: placeholder });
          }
        }
      };

      const queue = [...chunks];
      const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
        while (queue.length) {
          const c = queue.shift();
          if (!c) break;
          await runChunk(c);
        }
      });

      await Promise.all(workers);
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch prices', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
