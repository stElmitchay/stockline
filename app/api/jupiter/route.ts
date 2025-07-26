import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    console.log(`Jupiter API proxy: Fetching data for ids: ${ids}`);

    // Use the correct Jupiter API v3 endpoint
    let jupiterUrl = `https://lite-api.jup.ag/price/v3?ids=${ids}`;
    console.log(`Jupiter API proxy: Using Jupiter v3 endpoint: ${jupiterUrl}`);

    let response = await fetch(jupiterUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Stockline/1.0)',
      },
    });

    console.log(`Jupiter API proxy: Jupiter v3 endpoint response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jupiter API proxy: Error response: ${errorText}`);
      throw new Error(`Jupiter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Jupiter API proxy: Success, data keys: ${Object.keys(data).join(', ')}`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Jupiter API proxy error:', error);
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch Jupiter data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 