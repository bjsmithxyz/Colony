#!/bin/bash
echo "🔄 Restoring from backup..."

# Restore original files
RESTORE_FILES=(
    "js/Node.backup.js:js/Node.js"
    "js/Individual.backup.js:js/Individual.js"
    "js/Simulation.backup.js:js/Simulation.js"
    "js/main.backup.js:js/main.js"
    "index.backup.html:index.html"
)

for file_pair in "${RESTORE_FILES[@]}"; do
    src="${file_pair%:*}"
    dst="${file_pair#*:}"
    
    if [ -f "$src" ]; then
        mv "$src" "$dst"
        echo "✅ Restored $src → $dst"
    else
        echo "⚠️  $src not found (skipping)"
    fi
done

echo "🎉 Backup restored! Your original files are back."
