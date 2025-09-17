import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';

export const runtime = 'nodejs';

// Airtable configuration
const AIRTABLE_BASE_ID = 'appipJcYVv4Grvglt';
const AIRTABLE_TABLE_ID = 'tblNkOxBSMWJ3iCbK';

// Helper: upload image to IMGBB (if API key configured)
async function uploadImageToImgbb(file: File): Promise<string | null> {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) return null;

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const body = new URLSearchParams();
    body.set('key', apiKey);
    body.set('image', base64);
    body.set('name', file.name);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('IMGBB upload failed:', text);
      return null;
    }
    const data = await res.json();
    const url = data?.data?.url as string | undefined;
    return url || null;
  } catch (err) {
    console.error('IMGBB upload error:', err);
    return null;
  }
}

// Fallback: upload to 0x0.st (no-auth, public, potentially ephemeral)
async function uploadImageTo0x0(file: File): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('file', file, file.name);
    const res = await fetch('https://0x0.st', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('0x0.st upload failed:', text);
      return null;
    }
    const text = await res.text();
    // 0x0.st returns a plain URL in the body
    const url = text.trim();
    if (!url.startsWith('http')) return null;
    return url;
  } catch (err) {
    console.error('0x0.st upload error:', err);
    return null;
  }
}

// Fallback: upload to tmpfiles.org (no auth). Public link typically valid for days.
async function uploadImageToTmpfiles(file: File): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('file', file, file.name);
    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('tmpfiles upload failed:', text);
      return null;
    }
    const data = await res.json();
    const url = data?.data?.url as string | undefined;
    if (!url) return null;
    // Convert the landing page URL to the direct download URL Airtable can fetch
    // Example: https://tmpfiles.org/abcd -> https://tmpfiles.org/dl/abcd
    try {
      const u = new URL(url);
      if (!u.pathname.startsWith('/dl/')) {
        u.pathname = '/dl' + (u.pathname.endsWith('/') ? u.pathname.slice(0, -1) : u.pathname);
      }
      return u.toString();
    } catch {
      return url;
    }
  } catch (err) {
    console.error('tmpfiles upload error:', err);
    return null;
  }
}

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

    // Calculate amounts
    const originalAmount = parseFloat(amountInLeones);
    const netAmountAfterFees = originalAmount - totalFees; // what user actually gets in SLL

    // Prepare Airtable fields
    const airtableFields: Record<string, any> = {
      'Email': email,
      'Mobile Number': mobileNumber,
      // Store the net amount after fees so Airtable reflects the stock-credit amount
      'Amount in Leones': netAmountAfterFees,
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
      airtableFields['Notes'] = `First-time purchase. Original paid: ${originalAmount.toFixed(2)} SLL. Fees: ${totalFees.toFixed(2)} SLL (incl. onboarding ${onboardingFeeInLeones.toFixed(2)} SLL). Net credited: ${netAmountAfterFees.toFixed(2)} SLL.`;
    } else {
      airtableFields['Notes'] = `Original paid: ${originalAmount.toFixed(2)} SLL. Fees: ${totalFees.toFixed(2)} SLL. Net credited: ${netAmountAfterFees.toFixed(2)} SLL.`;
    }

    // Handle file upload if present
    if (paymentReceipt && paymentReceipt.size > 0) {
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes((paymentReceipt as any).type)) {
        return NextResponse.json(
          { error: 'Only JPG or PNG images are accepted.' },
          { status: 400 }
        );
      }
      // Try uploading to IMGBB if configured; fall back to tmpfiles, then 0x0.st
      let hostedUrl = await uploadImageToImgbb(paymentReceipt);
      if (!hostedUrl) hostedUrl = await uploadImageToTmpfiles(paymentReceipt);
      if (!hostedUrl) hostedUrl = await uploadImageTo0x0(paymentReceipt);
      if (!hostedUrl) {
        return NextResponse.json(
          { error: 'Failed to upload payment receipt. Please try again or try a smaller image.' },
          { status: 400 }
        );
      }
      const attachment = [
        {
          url: hostedUrl,
          filename: paymentReceipt.name,
        },
      ];
      // Only set the exact field name provided
      airtableFields['Payment Receipt'] = attachment;
    }

    // Create record in Airtable
    const result = await createAirtableRecord(airtableFields);

    return NextResponse.json({
      success: true,
      recordId: result.id,
      message: 'Stock purchase request submitted successfully',
      // For debugging: surface what we attempted to set
      attachmentDebug: {
        hasPaymentReceiptField: Boolean(airtableFields['Payment Receipt']),
      }
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