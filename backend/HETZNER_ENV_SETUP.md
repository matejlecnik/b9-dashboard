# Hetzner Server Environment Configuration

## Critical: R2_PUBLIC_URL Missing

**Problem:** Instagram scraper is currently saving images with direct R2 bucket URLs instead of custom domain.

**Current State:**
- Images saved as: `https://pub-497baa9dc05748f98aaed739c2a5ef08.r2.dev/...`
- Should be: `https://media.b9dashboard.com/...`

**Root Cause:** `R2_PUBLIC_URL` environment variable not set on Hetzner server.

## Fix Instructions

### 1. SSH into Hetzner Server

```bash
ssh root@91.98.91.129
```

### 2. Locate Backend Environment File

The backend service needs the `R2_PUBLIC_URL` environment variable set. Check where your environment variables are configured:

```bash
# If using systemd service
cat /etc/systemd/system/b9-backend.service

# If using .env file
cat /path/to/backend/.env

# If using Docker
docker inspect <container_name> | grep -A 20 "Env"
```

### 3. Add R2_PUBLIC_URL Environment Variable

**Option A: Systemd Service**
```bash
# Edit service file
sudo nano /etc/systemd/system/b9-backend.service

# Add under [Service]:
Environment="R2_PUBLIC_URL=https://media.b9dashboard.com"

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart b9-backend
```

**Option B: .env File**
```bash
# Edit .env file
nano /path/to/backend/.env

# Add:
R2_PUBLIC_URL=https://media.b9dashboard.com

# Restart backend service
sudo systemctl restart b9-backend  # or your restart command
```

**Option C: Docker**
```bash
# Add to docker-compose.yml or docker run command
environment:
  - R2_PUBLIC_URL=https://media.b9dashboard.com

# Restart container
docker-compose restart backend  # or docker restart <container>
```

### 4. Verify Configuration

After restarting, check the logs to confirm R2 is using the custom domain:

```bash
# Check backend logs
journalctl -u b9-backend -f  # systemd
# OR
docker logs -f <container>    # docker

# Look for log entries showing:
# "✅ Uploaded to R2: https://media.b9dashboard.com/..."
```

### 5. Test with New Creator

Add a new Instagram creator and verify the profile picture URL uses `media.b9dashboard.com`:

```sql
-- Query Supabase
SELECT username, profile_pic_url
FROM instagram_creators
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

## Additional Environment Variables

Ensure all required R2 variables are set:

```bash
R2_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret-key>
R2_BUCKET_NAME=b9-instagram-media
R2_PUBLIC_URL=https://media.b9dashboard.com  # ← ADD THIS
```

## Cloudflare R2 Custom Domain Setup

If the custom domain is not yet configured in Cloudflare:

1. Go to Cloudflare R2 Dashboard
2. Select your bucket: `b9-instagram-media`
3. Go to "Settings" → "Custom Domains"
4. Add custom domain: `media.b9dashboard.com`
5. Follow DNS setup instructions
6. Wait for SSL certificate to provision (~5 minutes)

## Notes

- **Existing 81 creators** with direct R2 URLs will continue to work (R2 bucket is public)
- **New creators** will use custom domain URLs
- **AI tagger** now accepts both URL patterns (temporary backward compatibility)
- **No data loss** - both URL formats point to same files

## Verification

Run this command to check if new images use custom domain:

```bash
curl -s http://91.98.91.129:10000/api/instagram/creators?limit=1 | jq '.data[0].profile_pic_url'
```

Expected: `"https://media.b9dashboard.com/..."`
Current: `"https://pub-497baa9dc05748f98aaed739c2a5ef08.r2.dev/..."`
