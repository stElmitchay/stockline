import { NextRequest, NextResponse } from 'next/server';

// Airtable configuration - standardized with other routes
const AIRTABLE_BASE_ID = 'appipJcYVv4Grvglt';
const AIRTABLE_TABLE_ID = 'tblNkOxBSMWJ3iCbK';

async function updateAirtableRecord(recordId: string, fields: Record<string, any>) {
  const AIRTABLE_PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
  
  if (!AIRTABLE_PAT) {
    throw new Error('Airtable Personal Access Token is not configured');
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_PAT}`,
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
  const AIRTABLE_PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
  
  if (!AIRTABLE_PAT) {
    throw new Error('Airtable Personal Access Token is not configured');
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
  
  // Create filter to find the most recent pending cashout record for this user
  const filterFormula = `AND(
    {Email} = '${email}',
    {Wallet Address} = '${walletAddress}',
    {Transaction Type} = 'CashOut',
    {Status} = 'Todo'
  )`;
  
  const params = new URLSearchParams({
    filterByFormula: filterFormula,
    'sort[0][field]': 'Created',
    'sort[0][direction]': 'desc',
    maxRecords: '1'
  });
  
  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_PAT}`
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
    const AIRTABLE_PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
    
    if (!AIRTABLE_PAT) {
      return NextResponse.json(
        { error: 'Airtable Personal Access Token is not configured' },
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

    // Update the record with transaction hash in Notes field
    // Status remains as 'Todo' - team will manually update after processing payment
    // Append to existing notes to avoid overwriting any existing data
    const existingNotes = record.fields.Notes || '';
    const newNote = `Transaction Hash: ${transactionHash}\nBlockchain transaction completed. Awaiting fiat payment processing.`;
    const separator = existingNotes ? '\n\n---\n\n' : '';

    const updatedFields = {
      'Notes': `${existingNotes}${separator}${newNote}`
    };

    const result = await updateAirtableRecord(record.id, updatedFields);

    return NextResponse.json({
      success: true,
      recordId: result.id,
      message: 'Transaction hash recorded successfully'
    });

  } catch (error) {
    console.error('Error updating cashout record:', error);
    return NextResponse.json(
      { error: 'Failed to update cashout record' },
      { status: 500 }
    );
  }
}