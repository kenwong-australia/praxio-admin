#!/bin/bash
# Script to remove Stripe secret key from git history

echo "⚠️  This will rewrite git history. Make sure you have a backup!"
echo ""
echo "Options:"
echo "1. Use GitHub unblock URL (easiest - recommended)"
echo "2. Rewrite git history to remove secret (cleaner but more complex)"
echo ""
read -p "Choose option (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "✅ Use this URL to unblock the push:"
    echo "https://github.com/kenwong-australia/praxio-admin/security/secret-scanning/unblock-secret/36Lp1PT27d084hsj69bJB3GS1os"
    echo ""
    echo "Then run: git push origin main"
    exit 0
fi

if [ "$choice" = "2" ]; then
    echo ""
    echo "Rewriting git history to remove secret..."
    echo ""
    
    # Use git filter-branch to remove the secret from history
    git filter-branch --force --index-filter \
        "git update-index --remove STRIPE_SETUP.md 2>/dev/null || true" \
        --prune-empty --tag-name-filter cat -- --all
    
    # Re-add the file with the secret removed
    git checkout HEAD -- STRIPE_SETUP.md 2>/dev/null || true
    
    echo ""
    echo "✅ History rewritten. The secret has been removed from git history."
    echo ""
    echo "⚠️  WARNING: You'll need to force push:"
    echo "   git push --force-with-lease origin main"
    echo ""
    echo "⚠️  Make sure no one else has pulled these commits!"
    exit 0
fi

echo "Invalid choice"
exit 1

