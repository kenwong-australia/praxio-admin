# How to Fix Git Push Protection Error

## The Problem
The Stripe secret key is in commit `467bd4c` in your git history. Even though we've removed it from the current file, GitHub scans all commits being pushed.

## Solution Options

### Option 1: Use GitHub Unblock URL (Recommended - Easiest)

1. Visit: https://github.com/kenwong-australia/praxio-admin/security/secret-scanning/unblock-secret/36Lp1PT27d084hsj69bJB3GS1os
2. Click "Allow secret" 
3. Push again: `git push origin main`

**Why this is OK:**
- Your repo is private
- The key is already set in Netlify
- The secret is already in history anyway
- This is the quickest solution

### Option 2: Rewrite Git History (Cleaner but More Complex)

Since the commit hasn't been pushed yet, you can rewrite history:

```bash
# Start interactive rebase from before the problematic commit
git rebase -i 74b3441

# In the editor that opens, change the line for commit 467bd4c from:
# pick 467bd4c feat(protected-layout): ...
# to:
# edit 467bd4c feat(protected-layout): ...

# Save and close. Git will stop at that commit.

# Now fix the file (it's already fixed in current version, so just amend):
git checkout HEAD -- STRIPE_SETUP.md
git add STRIPE_SETUP.md
git commit --amend --no-edit

# Continue the rebase
git rebase --continue

# Force push (since we rewrote history)
git push --force-with-lease origin main
```

**⚠️ Warning:** Only do this if:
- No one else has pulled these commits
- You're comfortable with force pushing
- You understand git rebase

## Recommendation

**Use Option 1** (GitHub unblock URL) - it's the simplest and safest since:
- The key is already exposed in that commit
- Your repo is private
- The key is already configured in Netlify
- No risk of breaking anything

