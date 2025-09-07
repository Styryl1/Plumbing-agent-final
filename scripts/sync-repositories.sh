#!/bin/bash
# Repository Synchronization Script
# Keeps all three repositories in sync with the main repository

set -e

MAIN_REPO="C:/Users/styry/plumbing-agent"
IN_REPO="C:/Users/styry/plumbing-agent-in" 
WEB_REPO="C:/Users/styry/plumbing-agent-web"

echo "🔄 Synchronizing repositories..."

# Function to sync a repository
sync_repo() {
    local repo_path="$1"
    local repo_name="$2"
    
    if [ -d "$repo_path" ]; then
        echo "📂 Syncing $repo_name..."
        cd "$repo_path"
        
        # Add main as remote if it doesn't exist
        if ! git remote get-url main >/dev/null 2>&1; then
            git remote add main "$MAIN_REPO"
        fi
        
        # Fetch latest from main
        git fetch main
        
        # Hard reset to main/main branch
        git reset --hard main/main
        
        echo "✅ $repo_name synced successfully"
    else
        echo "⚠️  $repo_name not found at $repo_path"
    fi
}

# Sync both repositories
sync_repo "$IN_REPO" "plumbing-agent-in"
sync_repo "$WEB_REPO" "plumbing-agent-web"

echo "🎉 All repositories synchronized!"
echo ""
echo "Next time you want to merge changes:"
echo "1. Work in separate feature directories/components"
echo "2. Run this script to sync before merging"
echo "3. Use: git merge --strategy=ours <branch> (keeps main version on conflicts)"