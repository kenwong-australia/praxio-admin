# Stripe Integration Setup Guide

## Environment Variable Setup

### For Vercel (Production)

1. Go to your Vercel dashboard
2. Navigate to your project → **Settings** → **Environment Variables**
3. Add a new variable:
   - **Key**: `STRIPE_SECRET_KEY`
   - **Value**: Your Stripe live secret key (starts with `sk_live_...`)
   - **Environments**: Select "Production", "Preview", and/or "Development" as needed

### For Local Development

Create a `.env.local` file in the root of your project:

```bash
STRIPE_SECRET_KEY=sk_live_...
```

**Note**: Replace `sk_live_...` with your actual Stripe secret key. Never commit this file to version control.

**Important**: Add `.env.local` to your `.gitignore` file to prevent committing secrets.

## How It Works

### 1. Customer Creation Flow

When a user clicks "Subscribe" on the pricing page:

1. **Check Firestore**: The system checks if the user already has a `stripe_cust_id`
2. **Create if Missing**: If no customer ID exists, it calls the Stripe API to create one
3. **Update Firestore**: The new customer ID is saved to the user's Firestore document
4. **Proceed to Checkout**: (Next step - to be implemented)

### 2. API Endpoint

**Route**: `/api/stripe/create-customer`

**Method**: `POST`

**Request Body**:
```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com"
}
```

Note: `business_name` is automatically read from Firestore user document.

**Response**:
```json
{
  "success": true,
  "customerId": "cus_xxxxx",
  "message": "Stripe customer created successfully"
}
```

### 3. Stripe Customer Data

When creating a customer, the following data is sent to Stripe:
- **Email**: User's email address
- **Name**: Business name (from `business_name` field in Firestore) or email if not available
- **Metadata**:
  - `firebase_uid`: Firebase user ID
  - `business_name`: Business name from Firestore

## Security Notes

⚠️ **IMPORTANT**: 
- The Stripe secret key you shared is a **LIVE** key (starts with `sk_live_`)
- Never commit this key to version control
- Always use environment variables
- Consider using Stripe's test keys (`sk_test_...`) for development

## Environment Variables Required

### In Vercel

1. **STRIPE_SECRET_KEY** (already set ✅)
   - Your Stripe live secret key

2. **NEXT_PUBLIC_STRIPE_PRICE_MONTHLY** (needs to be set)
   - Stripe price ID for monthly plan (e.g., `price_xxxxx`)
   - Go to Stripe Dashboard → Products → Your Monthly Product → Copy Price ID

3. **NEXT_PUBLIC_STRIPE_PRICE_YEARLY** (needs to be set)
   - Stripe price ID for yearly plan (e.g., `price_xxxxx`)
   - Go to Stripe Dashboard → Products → Your Yearly Product → Copy Price ID

## How It Works

### 1. Customer Creation Flow

When a user clicks "Subscribe" on the pricing page:

1. **Check Firestore**: The system checks if the user already has a `stripe_cust_id`
2. **Create if Missing**: If no customer ID exists, it calls the Stripe API to create one
3. **Update Firestore**: The new customer ID is saved to the user's Firestore document
4. **Create Checkout Session**: Creates a Stripe checkout session
5. **Redirect**: User is redirected to Stripe checkout page

### 2. Checkout Session Creation

**Route**: `/api/stripe/create-checkout-session`

**Method**: `POST`

**Request Body**:
```json
{
  "customer": "cus_xxxxx",
  "price": "price_xxxxx",
  "successUrl": "https://yoursite.com/pricing?success=true",
  "cancelUrl": "https://yoursite.com/pricing?canceled=true"
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "cs_test_xxxxx",
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxx",
  "message": "Checkout session created successfully"
}
```

### 3. Checkout Session Parameters

The checkout session is created with:
- **mode**: `subscription`
- **line_items[0][quantity]**: `1`
- **automatic_tax[enabled]**: `false`
- **allow_promotion_codes**: `true`
- **subscription_data[default_tax_rates]**: `txr_1RfyRgEVF5RQT3bLUK69hQnP`

## Next Steps

1. ✅ Set up STRIPE_SECRET_KEY in Vercel
2. ⏳ Set up NEXT_PUBLIC_STRIPE_PRICE_MONTHLY in Vercel
3. ⏳ Set up NEXT_PUBLIC_STRIPE_PRICE_YEARLY in Vercel
4. ✅ Customer creation API
5. ✅ Checkout session API endpoint
6. ✅ Checkout redirect implemented
7. ⏳ Handle webhooks for subscription updates

## Testing

To test the customer creation:

```bash
curl -X POST http://localhost:3000/api/stripe/create-customer \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "test-user-id",
    "email": "test@example.com"
  }'
```

## Troubleshooting

### Error: "STRIPE_SECRET_KEY environment variable is not set"
- Make sure you've added the environment variable in Vercel
- For local dev, ensure `.env.local` exists and has the key
- Restart your dev server after adding the variable
- After adding variables in Vercel, redeploy your application for changes to take effect

### Error: "Failed to create Stripe customer"
- Check that your Stripe secret key is valid
- Verify the key has the correct permissions
- Check Stripe dashboard for API errors

### Customer ID not saving to Firestore
- Verify Firebase Admin SDK is properly configured
- Check that the user document exists
- Ensure proper Firestore permissions

