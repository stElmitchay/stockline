import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiting
let lastBirdeyeCall = 0;
const BIRDEYE_RATE_LIMIT = 2000; // 2 seconds between calls (very conservative)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const addresses = searchParams.get('addresses'); // For batch requests
    const batchIndex = searchParams.get('batchIndex'); // For progressive loading

    // Handle batch requests
    if (addresses) {
      return await handleBatchRequest(addresses, batchIndex);
    }

    // Handle single address requests
    if (!address) {
      return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
    }

    // Validate address format (basic check)
    if (address.length !== 44 || !address.startsWith('Xs')) {
      console.log(`Birdeye API proxy: Invalid address format: ${address}`);
      return NextResponse.json({
        success: true,
        data: {
          value: 0.01,
          priceChange24h: 0,
          updateUnixTime: Math.floor(Date.now() / 1000),
          updateHumanTime: new Date().toISOString()
        }
      });
    }

    return await handleSingleRequest(address);
  } catch (error) {
    console.error('Birdeye API proxy error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch Birdeye data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

async function handleSingleRequest(address: string) {
  // Server-side rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastBirdeyeCall;
  if (timeSinceLastCall < BIRDEYE_RATE_LIMIT) {
    const waitTime = BIRDEYE_RATE_LIMIT - timeSinceLastCall;
    console.log(`Birdeye API proxy: Rate limiting, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastBirdeyeCall = Date.now();

      console.log(`Birdeye API proxy: Fetching data for address: ${address}`);
    console.log(`Birdeye API proxy: Address length: ${address.length}, starts with: ${address.substring(0, 4)}`);

    const birdeyeUrl = `https://public-api.birdeye.so/defi/price?address=${address}`;
    console.log(`Birdeye API proxy: Using Birdeye endpoint: ${birdeyeUrl}`);

  const response = await fetch(birdeyeUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-chain': 'solana',
      'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
      'User-Agent': 'Mozilla/5.0 (compatible; Stockline/1.0)',
    },
  });

  console.log(`Birdeye API proxy: Birdeye endpoint response status: ${response.status}`);

      if (!response.ok) {
      const errorText = await response.text();
      console.error(`Birdeye API proxy: Error response: ${errorText}`);
      
      if (response.status === 429) {
        console.log('Birdeye API proxy: Rate limited, returning fallback data');
        return NextResponse.json({
          success: true,
          data: {
            value: 0.01,
            priceChange24h: 0,
            updateUnixTime: Math.floor(Date.now() / 1000),
            updateHumanTime: new Date().toISOString()
          }
        });
      }
      
      if (response.status === 400 && errorText.includes('invalid format')) {
        console.log(`Birdeye API proxy: Invalid address format for ${address}, returning fallback data`);
        return NextResponse.json({
          success: true,
          data: {
            value: 0.01,
            priceChange24h: 0,
            updateUnixTime: Math.floor(Date.now() / 1000),
            updateHumanTime: new Date().toISOString()
          }
        });
      }
      
      throw new Error(`Birdeye API error: ${response.status} - ${errorText}`);
    }

  const data = await response.json();
  console.log(`Birdeye API proxy: Success, data structure:`, data);
  
  return NextResponse.json(data);
}

async function handleBatchRequest(addressesParam: string, batchIndex?: string | null) {
  const addressList = addressesParam.split(',').filter(addr => addr.trim());
  const batchNum = batchIndex ? parseInt(batchIndex) : 0;
  
  console.log(`Birdeye API proxy: Processing batch ${batchNum + 1} with ${addressList.length} addresses individually with delays`);
  
  const results: any = {};
  
      // Process each address individually with much longer delays and retry logic
    for (let i = 0; i < addressList.length; i++) {
      const address = addressList[i];
      
      // Much more conservative rate limiting
      if (i > 0) {
        const delay = 1500; // 1.5 seconds between requests
        console.log(`⏳ Waiting ${delay}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    
    try {
      const response = await fetch(`https://public-api.birdeye.so/defi/price?address=${address}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
          'User-Agent': 'Mozilla/5.0 (compatible; Stockline/1.0)',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        results[address] = data;
        console.log(`✅ Success: ${address} (${i + 1}/${addressList.length})`);
      } else if (response.status === 429) {
        console.log(`⚠️ Rate limited for ${address}, retrying after 2 seconds...`);
        
        // Wait 2 seconds and retry once
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const retryResponse = await fetch(`https://public-api.birdeye.so/defi/price?address=${address}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'x-chain': 'solana',
              'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
              'User-Agent': 'Mozilla/5.0 (compatible; Stockline/1.0)',
            },
          });
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            results[address] = data;
            console.log(`✅ Retry success: ${address}`);
          } else {
            console.log(`❌ Retry failed for ${address}: ${retryResponse.status}, using fallback`);
            results[address] = {
              success: true,
              data: {
                value: 0.01,
                priceChange24h: 0,
                updateUnixTime: Math.floor(Date.now() / 1000),
                updateHumanTime: new Date().toISOString()
              }
            };
          }
        } catch (retryError) {
          console.log(`❌ Retry error for ${address}:`, retryError);
          results[address] = {
            success: true,
            data: {
              value: 0.01,
              priceChange24h: 0,
              updateUnixTime: Math.floor(Date.now() / 1000),
              updateHumanTime: new Date().toISOString()
            }
          };
        }
      } else {
        console.log(`❌ Failed for ${address}: ${response.status}, using fallback`);
        results[address] = {
          success: true,
          data: {
            value: 0.01,
            priceChange24h: 0,
            updateUnixTime: Math.floor(Date.now() / 1000),
            updateHumanTime: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.log(`❌ Error for ${address}:`, error);
      results[address] = {
        success: true,
        data: {
          value: 0.01,
          priceChange24h: 0,
          updateUnixTime: Math.floor(Date.now() / 1000),
          updateHumanTime: new Date().toISOString()
        }
      };
    }
  }
  
  console.log(`🎯 Completed processing batch ${batchNum + 1} with ${addressList.length} addresses`);
  return NextResponse.json(results);
}
