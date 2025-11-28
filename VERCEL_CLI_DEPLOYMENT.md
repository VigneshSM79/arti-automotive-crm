# Vercel CLI Deployment Guide

Complete guide for deploying via Vercel CLI - perfect for collaborators who don't own the repository.

---

## Why Use Vercel CLI?

Use this method if:
- ✅ You're a collaborator (not repository owner)
- ✅ Vercel can't access the GitHub repository
- ✅ You want to deploy directly from your local machine
- ✅ You need quick deployments without GitHub integration

---

## Prerequisites

Before starting, ensure you have:
- [ ] Node.js installed (v18 or later)
- [ ] Vercel account (free tier works)
- [ ] Your `.env` file with Supabase credentials ready

---

## Step 1: Install Vercel CLI

Install globally using npm:
```bash
npm install -g vercel
```

Or using pnpm (recommended by Vercel):
```bash
pnpm i -g vercel
```

Or using yarn:
```bash
yarn global add vercel
```

### Verify Installation
```bash
vercel --version
```

You should see the version number (e.g., `Vercel CLI 37.0.0`).

### Update CLI (if needed)
```bash
npm install -g vercel@latest
```

---

## Step 2: Login to Vercel

Authenticate your CLI with Vercel:

```bash
vercel login
```

This will:
1. Open your browser automatically
2. Ask you to log in to Vercel
3. Confirm authentication
4. Return to your terminal

### Verify Login
```bash
vercel whoami
```

This shows your current Vercel username/email.

---

## Step 3: Navigate to Project

```bash
cd D:\Dev\Kaiden_Arti_Lovable
```

Make sure you're in the project root (where `package.json` is located).

---

## Step 4: Add Environment Variables

**IMPORTANT:** Add environment variables BEFORE deploying, otherwise your app won't work.

### Method 1: Add Variables Interactively (Recommended)

Add Supabase URL:
```bash
vercel env add VITE_SUPABASE_URL
```

You'll be prompted:
1. **What's the value?** → Paste your Supabase URL from `.env` file
2. **Add to which environments?** → Select all three:
   - `Production`
   - `Preview`
   - `Development`
   (Use spacebar to select, Enter to confirm)

Add Supabase Anon Key:
```bash
vercel env add VITE_SUPABASE_ANON_KEY
```

Repeat the same process:
1. Paste your anon key
2. Select all three environments

### Method 2: Add to Specific Environment

If you want to add variables one environment at a time:

```bash
# Production
vercel env add VITE_SUPABASE_URL production
# Paste value and press Enter

# Preview
vercel env add VITE_SUPABASE_URL preview
# Paste value and press Enter

# Development
vercel env add VITE_SUPABASE_URL development
# Paste value and press Enter

# Repeat for VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_SUPABASE_ANON_KEY preview
vercel env add VITE_SUPABASE_ANON_KEY development
```

### Verify Environment Variables

List all environment variables:
```bash
vercel env ls
```

You should see both variables listed for all environments.

### Pull Variables to Local (Optional)

Create a local `.env.local` file with your Vercel environment variables:
```bash
vercel env pull .env.local
```

This is useful for local development.

---

## Step 5: Deploy to Preview (Test First)

Deploy to a preview environment first to test everything works:

```bash
vercel
```

### First-Time Prompts:

```
? Set up and deploy "D:\Dev\Kaiden_Arti_Lovable"? [Y/n]
→ Press Y

? Which scope do you want to deploy to? [Your Account]
→ Select your account or team

? Link to existing project? [y/N]
→ Press N (create new project)

? What's your project's name? (drive-nurture-ai)
→ Press Enter or type a custom name

? In which directory is your code located? (.)
→ Press Enter (current directory)

Auto-detected Project Settings (Vite):
- Build Command: npm run build
- Development Command: npm run dev -- --port $PORT
- Install Command: `yarn install`, `pnpm install`, `npm install`, or `bun install`
- Output Directory: dist

? Want to modify these settings? [y/N]
→ Press N
```

### Deployment Process:

The CLI will:
1. 🔍 Inspect your project
2. 📦 Upload files (compressed)
3. 🔨 Build your project
4. ✅ Deploy to preview URL

You'll get a URL like:
```
https://drive-nurture-ai-abcd1234.vercel.app
```

### Test the Preview Deployment:

1. Open the URL in your browser
2. Test all features:
   - ✅ Login works
   - ✅ Dashboard loads
   - ✅ User Management works
   - ✅ Bulk CSV import functions
   - ✅ Leads display correctly
   - ✅ No console errors

---

## Step 6: Deploy to Production

Once preview deployment is tested and working:

```bash
vercel --prod
```

This will:
1. Build your project
2. Deploy to production URL
3. Assign to your custom domain (if configured)

You'll get the production URL:
```
https://drive-nurture-ai.vercel.app
```

### Subsequent Deployments:

For future deployments, just run:
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

No need to answer questions again - the CLI remembers your settings.

---

## Useful CLI Commands

### View Deployment Logs

```bash
vercel logs
```

Or for a specific deployment:
```bash
vercel logs [deployment-url]
```

### List All Deployments

```bash
vercel ls
```

### Redeploy Without Cache

Force a fresh build:
```bash
vercel --force
```

### Redeploy With Build Logs Visible

See build logs in real-time:
```bash
vercel --logs
```

### Skip Confirmation Prompts

Auto-answer yes to all prompts:
```bash
vercel --yes --prod
```

### Deploy Specific Directory

If you're not in the project root:
```bash
vercel --cwd D:\Dev\Kaiden_Arti_Lovable
```

### Promote Preview to Production

If you want to promote an existing preview deployment:
```bash
vercel promote [deployment-url]
```

### Rollback to Previous Deployment

```bash
vercel rollback
```

Follow prompts to select which deployment to rollback to.

### Inspect Deployment Details

```bash
vercel inspect [deployment-url]
```

Shows detailed information about a deployment.

---

## Managing Environment Variables

### List All Variables
```bash
vercel env ls
```

### List Variables for Specific Environment
```bash
vercel env ls production
vercel env ls preview
vercel env ls development
```

### Remove a Variable
```bash
vercel env rm VARIABLE_NAME production
```

Or skip confirmation:
```bash
vercel env rm VARIABLE_NAME production --yes
```

### Pull Variables to Local File
```bash
vercel env pull .env.local
```

Or for specific environment:
```bash
vercel env pull --environment=preview .env.preview
```

### Add Variable from File
```bash
vercel env add SECRET_KEY production < secret.txt
```

---

## Project Linking

If you need to link your local directory to an existing Vercel project:

```bash
vercel link
```

This is useful if you:
- Work on multiple machines
- Clone the repository fresh
- Want to link to a project created by someone else

---

## CI/CD Integration (Optional)

For automated deployments in GitHub Actions or other CI systems:

### Step 1: Create Vercel Token

1. Go to https://vercel.com/account/tokens
2. Create new token
3. Copy the token

### Step 2: Use Token in CI

```bash
# Set as environment variable
export VERCEL_TOKEN=your_token_here

# Deploy using token
vercel --token=$VERCEL_TOKEN --prod
```

---

## Troubleshooting

### Error: "No such file or directory"

**Solution:** Make sure you're in the project root directory:
```bash
cd D:\Dev\Kaiden_Arti_Lovable
pwd  # Verify current directory
```

### Error: "Environment variable already exists"

**Solution:** Remove the old variable first:
```bash
vercel env rm VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_URL production
```

### Build Fails: "Module not found"

**Solution:**
1. Make sure all dependencies are in `package.json`
2. Delete local `node_modules` and rebuild:
```bash
rm -rf node_modules
npm install
vercel --force
```

### Deployment URL Returns 404

**Solution:**
1. Check build succeeded (no errors in logs)
2. Verify output directory is `dist`
3. Check routing configuration

### Environment Variables Not Working

**Solution:**
1. Verify variables are added to correct environment:
```bash
vercel env ls production
```
2. Redeploy after adding variables:
```bash
vercel --prod
```
3. Variables MUST start with `VITE_` for Vite projects

### "Failed to fetch" or CORS Errors

**Solution:**
1. Add Vercel URL to Supabase allowed origins
2. Supabase Dashboard → Settings → API
3. Add: `https://your-project.vercel.app`

---

## Best Practices

### 1. Always Test Preview First
```bash
vercel       # Test preview
# Verify everything works
vercel --prod  # Then deploy to production
```

### 2. Use Environment Variables for Secrets
Never hardcode API keys or secrets in code.

### 3. Version Control
Keep your code in git before deploying:
```bash
git add .
git commit -m "Prepare for deployment"
git push
```

### 4. Monitor Deployments
Check deployment logs regularly:
```bash
vercel logs --follow
```

### 5. Use --force Sparingly
Only use `--force` when necessary (it clears cache and increases build time).

---

## Quick Reference Card

| Command | Purpose |
|---------|---------|
| `vercel` | Deploy to preview |
| `vercel --prod` | Deploy to production |
| `vercel login` | Authenticate CLI |
| `vercel env add` | Add environment variable |
| `vercel env ls` | List environment variables |
| `vercel env rm` | Remove environment variable |
| `vercel env pull` | Download env vars to local file |
| `vercel logs` | View deployment logs |
| `vercel ls` | List all deployments |
| `vercel link` | Link to existing project |
| `vercel --force` | Force rebuild without cache |
| `vercel --logs` | Show build logs during deploy |
| `vercel rollback` | Revert to previous deployment |
| `vercel promote` | Promote preview to production |
| `vercel whoami` | Show current user |
| `vercel --version` | Show CLI version |

---

## Post-Deployment Checklist

After deploying, verify:

- [ ] Application loads without errors
- [ ] Login/authentication works
- [ ] Environment variables are set correctly
- [ ] All pages are accessible
- [ ] User Management functions (admin only)
- [ ] CSV import works
- [ ] Lead Pool and Pipeline display
- [ ] Conversations load properly
- [ ] No console errors in browser
- [ ] Mobile responsive design works
- [ ] Supabase connection is active

---

## Next Steps

1. **Custom Domain:** Add your domain in Vercel Dashboard
2. **Analytics:** Enable Vercel Analytics for usage insights
3. **Monitoring:** Set up error tracking (Sentry, etc.)
4. **Team Access:** Invite team members in Vercel Dashboard
5. **Automatic Deployments:** Connect GitHub for auto-deploys (requires repo owner)

---

## Support Resources

- **Vercel CLI Docs:** https://vercel.com/docs/cli
- **Vercel Support:** https://vercel.com/support
- **Vite Documentation:** https://vitejs.dev
- **Supabase Docs:** https://supabase.com/docs

---

## Notes

- Vercel CLI deployments don't require GitHub access
- You can deploy from any branch or uncommitted changes
- Preview deployments are free and unlimited
- Production deployments count toward your plan limits
- Free tier: 100GB bandwidth/month, 100 hours build time/month

---

**Created:** November 28, 2025
**Project:** Automotive AI CRM
**Method:** Vercel CLI (for collaborators without repo access)
