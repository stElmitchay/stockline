import { NextRequest, NextResponse } from 'next/server';

// Airtable configuration
const AIRTABLE_BASE_ID = 'appipJcYVv4Grvglt';
const AIRTABLE_TABLE_ID = 'tblNkOxBSMWJ3iCbK';

// Helper function to create Airtable record using MCP server
async function createAirtableRecord(fields: Record<string, any>): Promise<any> {
  try {
    // This would typically use the MCP server, but for now we'll use direct API
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

    // Parse form data
    const formData = await request.formData();
    
    // Extract form fields
    const email = formData.get('email') as string;
    const mobileNumber = formData.get('mobileNumber') as string;
    const amountInLeones = formData.get('amountInLeones') as string;
    const stockTicker = formData.get('stockTicker') as string;
    const walletAddress = formData.get('walletAddress') as string;
    const paymentReceipt = formData.get('paymentReceipt') as File;
    const confirmation1 = formData.get('confirmation1') === 'true';
    const confirmation2 = formData.get('confirmation2') === 'true';
    const confirmationManualProcess = formData.get('confirmationManualProcess') === 'true';
    const transactionType = formData.get('transactionType') as string || 'CashIn'; // Default to CashIn for purchases
    const isFirstTimePurchase = formData.get('isFirstTimePurchase') === 'true';
    const onboardingFeeInLeones = formData.get('onboardingFeeInLeones') ? parseFloat(formData.get('onboardingFeeInLeones') as string) : 0;
    const totalFees = formData.get('totalFees') ? parseFloat(formData.get('totalFees') as string) : 0;

    // Validate required fields
    if (!email || !mobileNumber || !amountInLeones || !stockTicker || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate confirmations
    if (!confirmation1 || !confirmation2 || !confirmationManualProcess) {
      return NextResponse.json(
        { error: 'All confirmations must be checked' },
        { status: 400 }
      );
    }

    // Calculate the total amount including fees
    const originalAmount = parseFloat(amountInLeones);
    const totalAmountWithFees = originalAmount + totalFees;

    // Prepare Airtable fields
    const airtableFields: Record<string, any> = {
      'Email': email,
      'Mobile Number': mobileNumber,
      'Amount in Leones': totalAmountWithFees, // Store total amount including all fees
      'Stock Ticker': stockTicker,
      'Wallet Address': walletAddress,
      'Confirmation 1': confirmation1,
      'Confirmation 2': confirmation2,
      'this transaction is process manually, may take a few hours, and the final stock price can vary slightly from the estimate.': confirmationManualProcess,
      'Status': 'Todo', // Set default status to match Airtable options
      'Transaction Type': transactionType, // Add transaction type field
      'Subscription Fee': isFirstTimePurchase, // Mark as true if user paid onboarding fee
    };

    // Add onboarding fee information if applicable
    if (isFirstTimePurchase && onboardingFeeInLeones > 0) {
      airtableFields['Notes'] = `First-time purchase with $5 onboarding fee (${onboardingFeeInLeones.toFixed(2)} SLL). Original amount: ${originalAmount.toFixed(2)} SLL, Total fees: ${totalFees.toFixed(2)} SLL`;
    }

    // Handle file upload if present
    if (paymentReceipt && paymentReceipt.size > 0) {
      try {
        // For now, we'll store file info as text since direct file upload is complex
        airtableFields['Notes'] = `Payment receipt uploaded: ${paymentReceipt.name} (${paymentReceipt.size} bytes)`;
      } catch (fileError) {
        console.error('Error processing file:', fileError);
        // Continue without file if there's an error
      }
    }

    // Create record in Airtable
    const result = await createAirtableRecord(airtableFields);

    return NextResponse.json({
      success: true,
      recordId: result.id,
      message: 'Stock purchase request submitted successfully'
    });

  } catch (error) {
    console.error('Error in stock purchase submission:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to submit stock purchase request'
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