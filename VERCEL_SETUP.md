# Vercel Deployment Setup Guide

## Steps to Deploy txt2fit to Vercel

### 1. Delete Current Project (if exists)
- Go to https://vercel.com/dashboard
- Find **txt2fit** project
- Click on it → **Settings** → Scroll to bottom → **Delete Project**
- Confirm deletion

### 2. Create New Project
- Go to https://vercel.com
- Click **"Add New..."** → **"Project"**
- Click **"Import Git Repository"**
- Search for **grint0uc/txt2fit**
- Click **Import**

### 3. Configure Project Settings
**IMPORTANT - These settings are crucial:**

#### Framework Preset
- Select: **Vite**

#### Root Directory
- Change from `./` to: **`./web`**
- (This tells Vercel to build from the web folder)

#### Build & Output Settings
Should auto-fill to:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

If they don't auto-fill, enter them manually.

### 4. Add Environment Variables
Click **"Environment Variables"** and add BOTH:

```
Name: VITE_SUPABASE_URL
Value: https://gmjzeykgiqtftqrjdbts.supabase.co
```

```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtanpleWtnaXF0ZnRxcmpkYnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODk2ODksImV4cCI6MjA4NDU2NTY4OX0.VhsTvKhFL7NCNP1Ofz4qbsozZyLesYH1NFy3pTiBkZE
```

### 5. Deploy
- Click **"Deploy"**
- Wait 2-3 minutes for build to complete
- You should see ✅ at the top once complete

### 6. Get Your URL
- Once deployed, you'll see a message like:
  ```
  Congratulations! Your project has been successfully deployed.
  ```
- Click the preview link to see your live app!
- Your production URL is shown at the top

## Troubleshooting

### If Build Still Fails
1. Check the Vercel build logs (click Deployments → View Build Logs)
2. Share the exact error message
3. Make sure **Root Directory is set to `./web`** - this is critical!

### Common Issues
- ❌ Root Directory set to `/` → ✅ Change to `./web`
- ❌ Missing environment variables → ✅ Add both VITE_* variables
- ❌ Framework not set to Vite → ✅ Select Vite as framework

## Manual URL Entry
If you need to manually re-import:
- Repository: `https://github.com/grint0uc/txt2fit`
- Root Directory: `./web`
