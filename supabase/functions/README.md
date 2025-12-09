# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Automotive AI CRM system.

## Functions

### 1. `create-user`

**Purpose:** Admin-only function to create new users with full profile data.

**Why needed:** Creating users with custom passwords requires the service role key, which cannot be exposed in the frontend. This Edge Function runs server-side with secure access to admin APIs.

**Endpoint:** `https://rozuvsztctizlyfzezgb.supabase.co/functions/v1/create-user`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone_number": "+16042404206",
  "twilio_phone_number": "+17786533712",
  "designation": "Sales",
  "role": "sales_rep",
  "receive_sms_notifications": true,
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "sales_rep"
  }
}
```

**Error Response:**
```json
{
  "error": "Error message here"
}
```

---

## Deployment Instructions

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref [your-project-ref]
   ```

### Deploy All Functions

```bash
supabase functions deploy
```

### Deploy Single Function

```bash
supabase functions deploy create-user
```

### Set Environment Secrets

The Edge Functions automatically have access to:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (set automatically)

**No additional secrets needed** - these are provided by Supabase automatically.

---

## Local Development

### Serve Functions Locally

```bash
supabase start
supabase functions serve
```

This will start all functions locally at `http://localhost:54321/functions/v1/[function-name]`

### Test Locally

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-user' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "full_name": "Test User",
    "role": "sales_rep",
    "receive_sms_notifications": true,
    "is_active": true
  }'
```

---

## Production Setup

### 1. Deploy the Function

```bash
cd D:\Dev\Kaiden_Arti_Lovable
supabase functions deploy create-user
```

### 2. Verify Deployment

Check the Supabase Dashboard:
- Go to **Edge Functions** section
- Verify `create-user` is listed and active
- Check logs for any errors

### 3. Test from Frontend

The frontend (`UserManagement.tsx`) is already configured to call this function:

```typescript
const response = await supabase.functions.invoke('create-user', {
  body: { /* user data */ }
});
```

### 4. Monitor Logs

View function logs in Supabase Dashboard:
- Edge Functions → create-user → Logs
- Or use CLI: `supabase functions logs create-user`

---

## Security Notes

1. **Service Role Key:** Never expose the service role key in frontend code. It's only available server-side in Edge Functions.

2. **RLS Policies:** Even though the Edge Function uses the service role key, ensure proper Row-Level Security policies are in place.

3. **Input Validation:** The Edge Function validates required fields before processing.

4. **Error Handling:** Failed user creations are rolled back (auth user deleted if profile/role creation fails).

5. **CORS:** The function includes CORS headers to allow frontend access.

---

## Troubleshooting

### Error: "Function not found"

- Ensure function is deployed: `supabase functions list`
- Redeploy: `supabase functions deploy create-user`

### Error: "Service role key not found"

- This is set automatically by Supabase, no action needed
- If testing locally, ensure `supabase start` is running

### Error: "Failed to create user"

- Check Edge Function logs: `supabase functions logs create-user`
- Common causes:
  - Email already exists
  - Invalid email format
  - Password too weak
  - Database constraints violated

### Error: "CORS policy error"

- Edge Function includes CORS headers
- Ensure `Access-Control-Allow-Origin: *` is in response
- Check browser console for specific CORS error

---

## Development Workflow

1. Make changes to `index.ts`
2. Test locally: `supabase functions serve`
3. Deploy to production: `supabase functions deploy create-user`
4. Monitor logs: `supabase functions logs create-user --follow`

---

## Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
- [Edge Functions Examples](https://github.com/supabase/supabase/tree/master/examples/edge-functions)
