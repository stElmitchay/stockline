# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Subscription Fee Tracking System** - Enhanced onboarding fee system with persistent subscription status
  - Added `Subscription Fee` checkbox field in Airtable to track users who have paid the onboarding fee
  - Implemented subscription fee status checking in purchase history API
  - Users who have paid the $5 onboarding fee are marked with `Subscription Fee: true` in Airtable
  - Subsequent transactions for subscribed users only charge the $1 transaction fee

- **One-time $5 Onboarding Fee System** - Implemented a comprehensive onboarding fee system for first-time purchases
  - Added purchase history checking via new API endpoint `/api/airtable/check-purchase-history`
  - Integrated onboarding fee calculation (5 USD converted to Leones at 24.5 SLL/USD rate)
  - Updated stock purchase form to display onboarding fee as separate line item in transaction summary
  - Modified receipt generation to include onboarding fee details
  - Enhanced USSD payment modal to show correct total amount including onboarding fee
  - Updated Airtable record creation to store total amount with fees and onboarding fee metadata
  - Added visual indicators for first-time purchase status and fee breakdown
  - Implemented loading state while checking purchase history

### Changed
- Modified `components/stockPurchaseForm.tsx` to use subscription fee status instead of purchase history for onboarding fee determination
- Updated `app/api/airtable/submit-stock-purchase/route.ts` to set `Subscription Fee` checkbox when onboarding fee is paid
- Enhanced `app/api/airtable/check-purchase-history/route.ts` to return subscription fee status
- Enhanced transaction summary display to show both transaction fee and onboarding fee separately
- Updated payment amount calculation to include all applicable fees

### Technical Details
- Uses Airtable `Subscription Fee` checkbox field to track subscription status
- Onboarding fee only applies to users who haven't paid the subscription fee yet
- Once a user pays the onboarding fee, they are marked as subscribed and only pay transaction fees
- Fee is clearly displayed in transaction summary, receipt, and payment instructions
- All amounts are properly calculated and stored in Airtable for record keeping