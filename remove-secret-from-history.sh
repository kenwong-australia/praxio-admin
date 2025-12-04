#!/bin/bash
# Script to remove Stripe secret key from commit b22b71b

set -e

echo "⚠️  This will rewrite git history starting from commit b22b71b"
echo "⚠️  All commits after it will be rewritten"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Get the current clean version of STRIPE_SETUP.md
CLEAN_FILE="STRIPE_SETUP.md"

# Start interactive rebase from the commit before b22b71b
echo ""
echo "Starting interactive rebase..."
echo "When the editor opens, change 'pick' to 'edit' for commit b22b71b"
echo ""

# Create a rebase script
cat > /tmp/rebase_script.sh << 'REBASE_SCRIPT'
#!/bin/bash
# This will be used during rebase

# When we're at commit b22b71b, replace STRIPE_SETUP.md with clean version
if [ -f "STRIPE_SETUP.md" ]; then
    # The file already has the clean version in current HEAD
    # We just need to make sure it's clean
    git checkout HEAD -- STRIPE_SETUP.md 2>/dev/null || true
    git add STRIPE_SETUP.md
    git commit --amend --no-edit
fi
REBASE_SCRIPT

chmod +x /tmp/rebase_script.sh

# Use git filter-branch instead - simpler and more reliable
echo "Using git filter-branch to rewrite history..."
echo ""

# Rewrite the commit to remove the secret from STRIPE_SETUP.md
git filter-branch --force --index-filter \
    'if git show $GIT_COMMIT:STRIPE_SETUP.md > /dev/null 2>&1; then
        git show HEAD:STRIPE_SETUP.md > /tmp/clean_stripe.md 2>/dev/null || git show 338f413:STRIPE_SETUP.md > /tmp/clean_stripe.md
        git checkout-index --force --index --stdin < /dev/null 2>/dev/null || true
        if [ -f /tmp/clean_stripe.md ]; then
            git update-index --add --cacheinfo 100644 $(git hash-object -w /tmp/clean_stripe.md) STRIPE_SETUP.md
        fi
     fi' \
    --prune-empty \
    --tag-name-filter cat \
    -- b22b71b^..HEAD

echo ""
echo "✅ History rewritten!"
echo ""
echo "⚠️  Now you need to force push:"
echo "   git push --force-with-lease origin main"
echo ""
echo "⚠️  WARNING: Make sure no one else has pulled these commits!"

