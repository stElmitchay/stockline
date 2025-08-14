import { NextRequest, NextResponse } from 'next/server';

// Airtable configuration
const AIRTABLE_BASE_ID = 'appipJcYVv4Grvglt';
const AIRTABLE_TABLE_ID = 'tblNkOxBSMWJ3iCbK'; // Exchange table

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const AIRTABLE_PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
    
    if (!AIRTABLE_PAT) {
      throw new Error('Airtable Personal Access Token is not configured');
    }

    // Search for existing records with this email
    // Using filterByFormula to find records where Email field matches
    const filterFormula = `{Email} = "${email}"`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${encodeURIComponent(filterFormula)}`;

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
      throw new Error(`Failed to check purchase history: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const hasPreviousPurchases = data.records && data.records.length > 0;
    
    // Check if user has already paid the subscription fee (onboarding fee)
    const hasSubscriptionFee = data.records && data.records.some((record: any) => 
      record.fields['Subscription Fee'] === true
    );

    return NextResponse.json({
      hasPreviousPurchases,
      hasSubscriptionFee,
      recordCount: data.records ? data.records.length : 0
    });

  } catch (error) {
    console.error('Error checking purchase history:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to check purchase history'
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