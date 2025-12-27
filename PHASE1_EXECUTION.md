# PHASE 1: Execute SQL Security Fixes

## Prerequisites
1. Set these environment variables in your `.env.local`:
   ```
   ADMIN_SQL_TOKEN=your-secure-token-123
   ADMIN_TEST_TOKEN=another-secure-token-456
   ```

2. Have the development server running:
   ```
   npm run dev
   ```

## Step 1: Execute Phase 1 SQL
Make this curl request:
```bash
curl -X POST http://localhost:3000/api/admin/execute-phase1 \
  -H "Authorization: Bearer your-secure-token-123" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Phase 1 completed - RLS enabled and policies cleaned",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## Step 2: Validate Phase 1 Changes
```bash
curl -X POST http://localhost:3000/api/admin/validate-phase1 \
  -H "Authorization: Bearer another-secure-token-456" \
  -H "Content-Type: application/json"
```

**Expected response:**
```json
{
  "success": true,
  "validations": {
    "video_rooms_rls": true,
    "ice_candidates_rls": true,
    "signaling_rls": true,
    "video_queue_rls": true,
    "profiles_rls": true,
    "indexes_created": true,
    "likes_policies_clean": true,
    "matches_policies_clean": true
  },
  "message": "PHASE 1 validated successfully!"
}
```

## Step 3: Test that systems still work

### Test Matches
- Go to dashboard
- Login with 2 different users
- Have both users like each other
- Verify match appears for both
- **If this works**: ✅ Matches are safe

### Test Videochamada
- Go to dashboard with 2 users logged in
- Both click "Encontrar"
- Verify they see each other
- Try to connect video
- **If this works**: ✅ Videochamada is safe

### Test Builder
- Go to builder
- Create a simple page (title + button)
- Preview should render
- Save the project
- Load it again
- **If this works**: ✅ Builder is safe

## If something breaks:

The SQL is safely reversible. Contact support if you need to rollback.

---

**NEXT STEP:** After Phase 1 passes all tests, we move to Phase 2-5 testing.
