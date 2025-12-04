#!/bin/bash
# Script to rewrite commit b22b71b to remove Stripe secret

set -e

echo "Rewriting commit b22b71b to remove Stripe secret key..."
echo ""

# Get the clean version of STRIPE_SETUP.md from commit 338f413 (which already has it cleaned)
CLEAN_FILE="/tmp/clean_stripe_setup.md"
git show 338f413:STRIPE_SETUP.md > "$CLEAN_FILE"

# Create a script that will be used as the editor during rebase
EDITOR_SCRIPT="/tmp/rebase_editor.sh"
cat > "$EDITOR_SCRIPT" << 'EOF'
#!/bin/bash
# Auto-edit the rebase todo list
sed -i '' 's/^pick b22b71b/edit b22b71b/' "$1"
EOF
chmod +x "$EDITOR_SCRIPT"

# Start the rebase
export GIT_SEQUENCE_EDITOR="$EDITOR_SCRIPT"
git rebase -i 74b3441

# Now we're at commit b22b71b, replace the file
echo "Replacing STRIPE_SETUP.md with clean version..."
cp "$CLEAN_FILE" STRIPE_SETUP.md
git add STRIPE_SETUP.md
git commit --amend --no-edit

# Continue the rebase
git rebase --continue

echo ""
echo "✅ Commit b22b71b has been rewritten!"
echo ""
echo "⚠️  Now force push to GitHub:"
echo "   git push --force-with-lease origin main"

