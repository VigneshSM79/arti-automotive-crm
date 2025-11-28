# Vercel Deployment Guide

Complete step-by-step guide for deploying the Automotive AI CRM to Vercel.

---

## Step 1: Prepare Your Repository

First, make sure your changes are merged or your branch is ready:

```bash
# Option A: Merge to main branch first (recommended)
git checkout main
git merge feature/user-management-bulk-csv
git push origin main

# Option B: Deploy directly from the feature branch
# (Vercel can deploy from any branch)
```

---

## Step 2: Sign Up / Log In to Vercel

1. Go to https://vercel.com
2. Click "Sign Up" (or "Log In" if you have an account)
3. Choose "Continue with GitHub" for easiest integration
4. Authorize Vercel to access your GitHub repositories

---

## Step 3: Import Your Project

1. Once logged in, click **"Add New..."** → **"Project"**
2. You'll see a list of your GitHub repositories
3. Find **"drive-nurture-ai"** repository
4. Click **"Import"** next to it

---

## Step 4: Configure Project Settings

Vercel will auto-detect that this is a Vite project. Configure these settings:

**Framework Preset:** `Vite` (should be auto-detected)

**Root Directory:** `.` (leave as default)

**Build Command:**
```
npm run build
```

**Output Directory:**
```
dist
```

**Install Command:**
```
npm install
```

---

## Step 5: Add Environment Variables

This is **CRITICAL** - your app won't work without these:

1. Click **"Environment Variables"** section
2. Add these variables one by one:

### Variable 1: Supabase URL
```
Variable Name: VITE_SUPABASE_URL
Value: [Your Supabase project URL from .env file]
Environment: Production, Preview, Development (select all three)
```

### Variable 2: Supabase Anon Key
```
Variable Name: VITE_SUPABASE_ANON_KEY
Value: [Your Supabase anon key from .env file]
Environment: Production, Preview, Development (select all three)
```

**To get these values:**
- Open your `.env` file locally (located in `D:\Dev\Kaiden_Arti_Lovable\.env`)
- Copy the values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Paste them into Vercel

**Important:** Make sure to select **"Production"**, **"Preview"**, and **"Development"** for each variable

---

## Step 6: Deploy

1. Click **"Deploy"** button
2. Vercel will:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Build your project (`npm run build`)
   - Deploy to their CDN
3. Wait 2-3 minutes for the build to complete
4. You'll see build logs in real-time

---

## Step 7: Verify Deployment

1. Once complete, you'll see a success screen with your deployment URL
2. Click **"Visit"** to open your live application
3. Test the following:
   - ✅ Login works
   - ✅ Dashboard loads
   - ✅ User Management page works (admin only)
   - ✅ Bulk CSV import works
   - ✅ Leads display correctly
   - ✅ Pipeline and Lead Pool function properly
   - ✅ Conversations load
   - ✅ Analytics dashboard displays

---

## Step 8: Configure Custom Domain (Optional)

1. Go to your project's **Settings** → **Domains**
2. Add your custom domain (if you have one)
3. Follow Vercel's DNS configuration instructions
4. Vercel will automatically provision SSL certificate

---

## Step 9: Set Up Automatic Deployments

Vercel automatically sets up continuous deployment:

- **Production deployments:** Triggered by pushes to `main` branch
- **Preview deployments:** Triggered by pushes to any other branch or pull requests
- **Branch deployments:** Each branch gets its own preview URL

You can configure this in **Settings** → **Git**

### Deployment Workflow:
```
git push origin main → Vercel detects push → Builds → Deploys to production
git push origin feature-branch → Vercel builds → Creates preview deployment
```

---

## Quick Reference

### Your Deployment URLs

**Production:**
```
https://[your-project-name].vercel.app
```

**Custom Domain (if configured):**
```
https://your-domain.com
```

**Preview Deployments:**
```
https://[your-project-name]-[branch-name]-[team-name].vercel.app
```

### Build Settings Summary

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node Version | 18.x (auto-detected) |

### Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ Yes | Your Supabase anonymous key |

---

## Troubleshooting Common Issues

### Build Fails with "Module not found"
**Solution:**
- Make sure all dependencies are in `package.json`
- Run `npm install` locally to verify
- Check that all imports use correct file paths
- Ensure case-sensitive file names match (important on Linux/Vercel)

### Blank Page After Deployment
**Solution:**
- Check browser console for errors (F12)
- Verify environment variables are set correctly
- Check that Supabase URL and keys are correct
- Ensure environment variables have `VITE_` prefix

### Environment Variables Not Working
**Solution:**
- Must start with `VITE_` prefix for Vite projects
- Redeploy after adding/changing environment variables
- Go to Deployments → Click "..." → "Redeploy"

### Build Succeeds but Features Don't Work
**Solution:**
- Check Supabase RLS policies are configured
- Verify Edge Functions are deployed in Supabase
- Check database migrations have been applied
- Ensure Supabase project URL matches environment variable

### "Failed to fetch" or CORS Errors
**Solution:**
- Add Vercel deployment URL to Supabase allowed domains
- Go to Supabase Dashboard → Settings → API → URL Configuration
- Add: `https://[your-project-name].vercel.app`

---

## Post-Deployment Checklist

After deploying, verify these items:

- [ ] Application loads without errors
- [ ] Login/authentication works
- [ ] All pages are accessible
- [ ] Supabase connection is working
- [ ] User Management functions (admin only)
- [ ] CSV import uploads and validates
- [ ] Lead Pool and Pipeline display correctly
- [ ] Conversations load properly
- [ ] Analytics dashboard shows data
- [ ] SMS notifications are configured (if using Twilio)
- [ ] Edge Functions are working (check Supabase logs)

---

## Updating the Deployment

### For Code Changes:
```bash
# Make your changes locally
git add .
git commit -m "Your commit message"
git push origin main

# Vercel automatically deploys the changes
```

### For Environment Variable Changes:
1. Go to Vercel Dashboard → Your Project
2. Settings → Environment Variables
3. Edit or add variables
4. Go to Deployments tab
5. Click "..." on latest deployment → "Redeploy"

---

## Advanced Configuration

### Custom Build Command (if needed)
```bash
# In Vercel project settings
Build Command: npm run build:production
```

### Environment-Specific Variables
```bash
# Production only
VITE_API_URL=https://api.production.com

# Preview only
VITE_API_URL=https://api.staging.com

# Development only
VITE_API_URL=http://localhost:3000
```

### Vercel Configuration File (Optional)
Create `vercel.json` in project root:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Monitoring and Analytics

### Vercel Analytics
1. Go to your project → Analytics tab
2. View page views, performance metrics, and user data
3. Available on Pro plan

### Deployment Logs
1. Go to Deployments tab
2. Click on any deployment
3. View build logs and runtime logs
4. Check for errors or warnings

---

## Rollback Procedure

If a deployment breaks production:

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"
4. Previous deployment is instantly restored

---

## Security Best Practices

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use environment variables** - Never hardcode secrets
3. **Rotate Supabase keys** - If accidentally exposed
4. **Enable Vercel authentication** - For preview deployments (optional)
5. **Monitor deployment logs** - Check for suspicious activity

---

## Support Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Vite Documentation:** https://vitejs.dev/guide/
- **Supabase Documentation:** https://supabase.com/docs
- **Vercel Support:** https://vercel.com/support

---

## Notes

- First deployment may take 3-5 minutes
- Subsequent deployments are faster (1-2 minutes)
- Preview deployments are created for all branches and PRs
- Vercel provides automatic HTTPS certificates
- Free tier includes 100GB bandwidth per month

---

**Last Updated:** November 28, 2025
**Project:** Automotive AI CRM
**Repository:** drive-nurture-ai
