import { NextRequest, NextResponse } from 'next/server';

// Airtable configuration
const AIRTABLE_BASE_ID = 'appipJcYVv4Grvglt';
const AIRTABLE_TABLE_ID = 'tblNkOxBSMWJ3iCbK';

// Helper function to create Airtable record
async function createAirtableRecord(fields: Record<string, any>): Promise<any> {
  try {
    const AIRTABLE_PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
    
    if (!AIRTABLE_PAT) {
      throw new Error('Airtable Personal Access Token is not configured');
    }

    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: fields,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Airtable API Error:', errorData);
      throw new Error(`Failed to create record: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Airtable record:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      mobileNumber,
      tokenAmount,
      usdValue,
      tokenSymbol,
      walletAddress,
      transactionHash
    } = await request.json();

    // Validate required fields
    if (!email || !mobileNumber || !tokenAmount || !usdValue || !tokenSymbol || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prepare Airtable fields for cashout
    const airtableFields = {
      'Email': email,
      'Mobile Number': mobileNumber,
      'CashOut Amount': parseFloat(usdValue), // Using the exact field name from Airtable
      'Stock Ticker': tokenSymbol, // Using this field for token symbol
      'Wallet Address': walletAddress,
      'Transaction Type': 'CashOut',
      'Status': 'Todo' // Set to Todo since no transaction has occurred yet
    };

    // Create record in Airtable
    const result = await createAirtableRecord(airtableFields);

    return NextResponse.json({
      success: true,
      recordId: result.id,
      message: 'Cashout request submitted successfully'
    });

  } catch (error) {
    console.error('Error in cashout submission:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to submit cashout request'
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}