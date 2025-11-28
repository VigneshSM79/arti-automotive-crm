# How to Update Environment Variables on Vercel

## Quick Guide for Updating Environment Variables After Deployment

---

## Method 1: Via Vercel Dashboard (Easiest)

### Step-by-Step:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click on your project: **"arti-automotive-crm"**

2. **Navigate to Environment Variables**
   - Click **"Settings"** tab (top navigation)
   - Click **"Environment Variables"** (left sidebar)

3. **Make Your Changes**

   **To Edit Existing Variable:**
   - Find the variable you want to change
   - Click the **"..."** menu (three dots) on the right
   - Click **"Edit"**
   - Update the value
   - Click **"Save"**

   **To Add New Variable:**
   - Click **"Add"** or **"Add Another"** button
   - Enter Variable Name (e.g., `VITE_NEW_VARIABLE`)
   - Enter Value
   - Select Environments: ☑ Production ☑ Preview ☑ Development
   - Click **"Save"**

   **To Delete Variable:**
   - Click the **"..."** menu next to the variable
   - Click **"Delete"**
   - Confirm deletion

4. **Redeploy to Apply Changes** ⚠️ CRITICAL STEP
   - Go to **"Deployments"** tab
   - Find the most recent deployment
   - Click **"..."** (three dots) on the right
   - Click **"Redeploy"**
   - Confirm by clicking **"Redeploy"** again
   - Wait 1-2 minutes for redeployment to complete

**Important Notes:**
- Environment variable changes are NOT applied automatically
- You MUST redeploy for changes to take effect
- No code changes needed - just redeploy existing deployment

---

## Method 2: Via Vercel CLI (Advanced - For Developers)

### Prerequisites:
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login
```

### Add/Update Environment Variables:
```bash
# Add a new environment variable
vercel env add VITE_NEW_VARIABLE

# You'll be prompted to:
# 1. Enter the value
# 2. Select environments (Production, Preview, Development)

# Pull environment variables to local
vercel env pull .env.local
```

### Remove Environment Variable:
```bash
vercel env rm VITE_VARIABLE_NAME

# Select which environment to remove from
```

### List All Environment Variables:
```bash
vercel env ls
```

### Trigger Redeploy:
```bash
# From your project directory
vercel --prod

# This redeploys with updated environment variables
```

---

## Method 3: Environment-Specific Variables

You can set different values for different environments:

### In Vercel Dashboard:

**Production Only:**
1. Add variable
2. Select only ☑ **Production**
3. Example: `VITE_API_URL=https://api.production.com`

**Preview Only:**
1. Add variable
2. Select only ☑ **Preview**
3. Example: `VITE_API_URL=https://api.staging.com`

**Development Only:**
1. Add variable
2. Select only ☑ **Development**
3. Example: `VITE_API_URL=http://localhost:3000`

---

## Common Use Cases

### Scenario 1: Update Supabase URL (Changed Projects)

1. Go to Settings → Environment Variables
2. Find `VITE_SUPABASE_URL`
3. Click "..." → Edit
4. Paste new Supabase URL
5. Click Save
6. Go to Deployments → Redeploy latest

### Scenario 2: Add New API Key

1. Go to Settings → Environment Variables
2. Click "Add Another"
3. Name: `VITE_NEW_API_KEY`
4. Value: `your-api-key-here`
5. Select all environments
6. Click Save
7. Redeploy

### Scenario 3: Rotate Security Keys

1. Generate new key in your service (e.g., Supabase)
2. Go to Vercel Settings → Environment Variables
3. Edit the variable with new key
4. Save
5. **Immediately redeploy** to apply new key
6. Revoke old key in your service (after confirming new one works)

### Scenario 4: Remove Unused Variables

1. Go to Settings → Environment Variables
2. Find variable to remove
3. Click "..." → Delete
4. Confirm deletion
5. Redeploy (optional, but recommended for cleanup)

---

## Important Reminders

### ⚠️ Critical Points:

1. **Always Redeploy After Changes**
   - Environment variables are "baked in" at build time for Vite apps
   - Changes won't apply until you redeploy

2. **VITE_ Prefix Required**
   - For Vite projects, all client-side variables must start with `VITE_`
   - Example: `VITE_SUPABASE_URL` ✅
   - Example: `SUPABASE_URL` ❌ (won't work)

3. **Never Commit .env File**
   - Already in `.gitignore`
   - Environment variables should only be in Vercel dashboard

4. **Check All Environments**
   - When adding variables, select which environments need them
   - Usually select all three: Production, Preview, Development

5. **Case Sensitive**
   - `VITE_API_KEY` ≠ `vite_api_key`
   - Keep variable names consistent

---

## Verification Steps

After updating environment variables and redeploying:

### 1. Check Build Logs
- Go to Deployments → Click on latest deployment
- Check "Building" section
- Verify no errors about missing environment variables

### 2. Test in Browser
- Visit your deployed site
- Open browser console (F12)
- Check if app loads correctly
- Verify features using the updated variables work

### 3. Check Runtime
```javascript
// In browser console, test if variable is accessible:
console.log(import.meta.env.VITE_SUPABASE_URL)

// Should output the value (if public/client-side)
```

---

## Troubleshooting

### Issue: Changes Not Appearing After Redeploy

**Solutions:**
1. Clear browser cache (Ctrl + Shift + Delete)
2. Try incognito/private window
3. Check if you redeployed the correct environment (Production vs Preview)
4. Verify variable name has `VITE_` prefix

### Issue: "Environment variable is undefined"

**Solutions:**
1. Confirm variable name is spelled correctly
2. Check it starts with `VITE_` for client-side access
3. Verify it's set for correct environment (Production/Preview/Development)
4. Redeploy after adding variable

### Issue: Old Value Still Showing

**Solutions:**
1. Wait 1-2 minutes after redeploy completes
2. Clear CDN cache: Deployments → "..." → "Clear Cache and Redeploy"
3. Hard refresh browser: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)

---

## Quick Reference

| Action | Dashboard Path | Time to Apply |
|--------|---------------|---------------|
| Add Variable | Settings → Environment Variables → Add | After redeploy (1-2 min) |
| Edit Variable | Settings → Environment Variables → Edit | After redeploy (1-2 min) |
| Delete Variable | Settings → Environment Variables → Delete | After redeploy (1-2 min) |
| Redeploy | Deployments → "..." → Redeploy | 1-2 minutes |

---

## Best Practices

1. **Document Your Variables**
   - Keep a list of required variables in README
   - Use `.env.example` file as template (already in repo)

2. **Use Descriptive Names**
   - Good: `VITE_SUPABASE_URL`
   - Bad: `VITE_URL1`

3. **Rotate Keys Regularly**
   - Update API keys every 90 days
   - Use Vercel to update without code changes

4. **Test Before Production**
   - Update Preview environment first
   - Test thoroughly
   - Then update Production

5. **Backup Old Values**
   - Before changing, copy old value somewhere safe
   - In case you need to rollback

---

## Example Workflow: Updating Supabase Keys

```bash
# Step-by-step example:

1. Go to Supabase Dashboard → Settings → API
2. Copy new `URL` and `anon public` key
3. Go to Vercel Dashboard → arti-automotive-crm → Settings → Environment Variables
4. Edit `VITE_SUPABASE_URL` → Paste new URL → Save
5. Edit `VITE_SUPABASE_PUBLISHABLE_KEY` → Paste new key → Save
6. Go to Deployments tab
7. Click "..." on latest deployment → Redeploy
8. Wait for deployment to complete
9. Test login on deployed site
10. Confirm everything works
```

---

**Last Updated:** November 28, 2025
**Project:** Automotive AI CRM
**Vercel Project:** arti-automotive-crm
