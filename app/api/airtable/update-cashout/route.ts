import { NextRequest, NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Stock Purchase Requests';

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing Airtable configuration');
}

async function updateAirtableRecord(recordId: string, fields: Record<string, any>) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}/${recordId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airtable API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

async function findCashoutRecord(email: string, walletAddress: string) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  
  // Create filter to find the most recent pending cashout record for this user
  const filterFormula = `AND(
    {Email} = '${email}',
    {Wallet Address} = '${walletAddress}',
    {Transaction Type} = 'CashOut',
    {Status} = 'Todo'
  )`;
  
  const params = new URLSearchParams({
    filterByFormula: filterFormula,
    sort: JSON.stringify([{field: 'Created', direction: 'desc'}]),
    maxRecords: '1'
  });
  
  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airtable API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.records[0] || null;
}

export async function POST(request: NextRequest) {
  try {
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: 'Airtable configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, walletAddress, transactionHash } = body;

    if (!email || !walletAddress || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields: email, walletAddress, transactionHash' },
        { status: 400 }
      );
    }

    // Find the pending cashout record
    const record = await findCashoutRecord(email, walletAddress);
    
    if (!record) {
      return NextResponse.json(
        { error: 'No pending cashout record found for this user' },
        { status: 404 }
      );
    }

    // Update the record with status (Transaction Hash field doesn't exist in table)
    const updatedFields = {
      'Status': 'Completed'
    };

    const result = await updateAirtableRecord(record.id, updatedFields);

    return NextResponse.json({
      success: true,
      recordId: result.id,
      message: 'Cashout record updated successfully'
    });

  } catch (error) {
    console.error('Error updating cashout record:', error);
    return NextResponse.json(
      { error: 'Failed to update cashout record' },
      { status: 500 }
    );
  }
}