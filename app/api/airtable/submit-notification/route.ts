import { NextRequest, NextResponse } from 'next/server';

// Airtable configuration
const AIRTABLE_BASE_ID = 'appipJcYVv4Grvglt';
const AIRTABLE_TABLE_ID = 'tbl8SeuT9i1mJh1NR'; // Coming Soon table

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
      walletAddress,
      stockTicker
    } = await request.json();

    // Validate required fields
    if (!email || !walletAddress || !stockTicker) {
      return NextResponse.json(
        { error: 'Missing required fields: email, walletAddress, and stockTicker are required' },
        { status: 400 }
      );
    }

    // Prepare Airtable fields for notification
    const airtableFields = {
      'Email': email,
      'Wallet Address': walletAddress,
      'Stock ticker': stockTicker
    };

    // Create record in Airtable
    const result = await createAirtableRecord(airtableFields);

    return NextResponse.json({
      success: true,
      recordId: result.id,
      message: 'Notification request submitted successfully'
    });

  } catch (error) {
    console.error('Error in notification submission:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to submit notification request'
      },
      { status: 500 }
    );
  }
}