import { NextRequest, NextResponse } from 'next/server';

type HoldingRecord = {
  id: string;
  created: string;
  stockTicker: string;
  amount: number;
  status: string;
  transactionType: string;
};

// Airtable configuration
const AIRTABLE_BASE_ID = 'appipJcYVv4Grvglt';
const AIRTABLE_TABLE_ID = 'tblNkOxBSMWJ3iCbK'; // Exchange table

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const AIRTABLE_PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
    
    if (!AIRTABLE_PAT) {
      throw new Error('Airtable Personal Access Token is not configured');
    }

    // Search for records with this wallet address
    const filterFormula = `{Wallet Address} = "${walletAddress}"`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${encodeURIComponent(filterFormula)}&sort[0][field]=Created&sort[0][direction]=desc`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Airtable API Error:', errorData);
      throw new Error(`Failed to fetch holdings history: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Process the records to create historical data
    const holdingsHistory: HoldingRecord[] = data.records?.map((record: Record<string, any>) => ({
      id: record.id as string,
      created: record.createdTime as string,
      stockTicker: (record.fields as Record<string, unknown>)['Stock Ticker'] as string || '',
      amount: (record.fields as Record<string, unknown>)['Amount in Leones'] as number || 0,
      status: (record.fields as Record<string, unknown>)['Status'] as string || 'Todo',
      transactionType: (record.fields as Record<string, unknown>)['Transaction Type'] as string || 'CashIn'
    })) || [];

    // Group by date and calculate daily portfolio value
    const dailyHoldings = holdingsHistory.reduce((acc: Record<string, { date: string; totalValue: number; transactions: HoldingRecord[] }>, record: HoldingRecord) => {
      const date = new Date(record.created).toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          totalValue: 0,
          transactions: []
        };
      }
      
      // Only count completed transactions
      if (record.status === 'Done' && record.transactionType === 'CashIn') {
        acc[date].totalValue += record.amount;
      }
      
      acc[date].transactions.push(record);
      
      return acc;
    }, {});

    // Convert to array and sort by date
    const holdingsData = Object.values(dailyHoldings)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate cumulative holdings over time
    let cumulativeValue = 0;
    const cumulativeHoldings = holdingsData.map((day: { date: string; totalValue: number; transactions: unknown[] }) => {
      cumulativeValue += day.totalValue;
      return {
        date: day.date,
        value: cumulativeValue,
        dailyChange: day.totalValue
      };
    });

    return NextResponse.json({
      success: true,
      holdingsHistory: cumulativeHoldings,
      totalRecords: holdingsHistory.length
    });

  } catch (error) {
    console.error('Error fetching holdings history:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to fetch holdings history'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
