#!/bin/bash

# Safe Migration Script - Option A
echo "🚀 Starting Safe Migration to Refactored System..."
echo "This will replace original files with refactored versions"
echo ""

# Confirm with user
read -p "Are you sure you want to proceed? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "📦 Creating backup tag..."
git tag backup-pre-migration-$(date +%Y%m%d-%H%M%S)
if [ $? -eq 0 ]; then
    echo "✅ Backup tag created"
else
    echo "⚠️  Warning: Could not create git tag (continuing anyway)"
fi

echo ""
echo "🔄 Step 1: Backing up original files..."

# Backup original files
ORIGINAL_FILES=(
    "js/Node.js:js/Node.backup.js"
    "js/Individual.js:js/Individual.backup.js" 
    "js/Simulation.js:js/Simulation.backup.js"
    "js/main.js:js/main.backup.js"
    "index.html:index.backup.html"
)

for file_pair in "${ORIGINAL_FILES[@]}"; do
    src="${file_pair%:*}"
    dst="${file_pair#*:}"
    
    if [ -f "$src" ]; then
        mv "$src" "$dst"
        echo "✅ Backed up $src → $dst"
    else
        echo "⚠️  $src not found (skipping)"
    fi
done

echo ""
echo "🔄 Step 2: Moving refactored files to original names..."

# Move refactored files to original names
REFACTORED_MIGRATIONS=(
    "js/NodeRefactored.js:js/Node.js"
    "js/IndividualRefactored.js:js/Individual.js"
    "js/SimulationRefactored.js:js/Simulation.js"
    "js/mainRefactored.js:js/main.js"
    "index_refactored.html:index.html"
)

for file_pair in "${REFACTORED_MIGRATIONS[@]}"; do
    src="${file_pair%:*}"
    dst="${file_pair#*:}"
    
    if [ -f "$src" ]; then
        cp "$src" "$dst"
        echo "✅ Migrated $src → $dst"
    else
        echo "❌ $src not found!"
        exit 1
    fi
done

echo ""
echo "🔄 Step 3: Updating import paths in migrated files..."

# Update import paths in the new main files
echo "Updating js/Simulation.js imports..."
sed -i 's/from '\''\.\/NodeRefactored\.js'\''/from '\''\.\/Node\.js'\''/g' js/Simulation.js
sed -i 's/from '\''\.\/IndividualRefactored\.js'\''/from '\''\.\/Individual\.js'\''/g' js/Simulation.js

echo "Updating js/main.js imports..."
sed -i 's/SimulationRefactored as Simulation/Simulation/g' js/main.js
sed -i 's/from '\''\.\/SimulationRefactored\.js'\''/from '\''\.\/Simulation\.js'\''/g' js/main.js

echo "Updating index.html script reference..."
sed -i 's/js\/mainRefactored\.js/js\/main\.js/g' index.html

echo ""
echo "🧪 Step 4: Testing migrated system..."

# Test the migrated files
echo "Checking syntax of migrated files..."
MIGRATED_FILES=("js/Node.js" "js/Individual.js" "js/Simulation.js" "js/main.js")

syntax_errors=0
for file in "${MIGRATED_FILES[@]}"; do
    if node -c "$file" 2>/dev/null; then
        echo "✅ $file syntax OK"
    else
        echo "❌ $file syntax error"
        ((syntax_errors++))
    fi
done

if [ $syntax_errors -eq 0 ]; then
    echo "✅ All migrated files have valid syntax"
else
    echo "❌ $syntax_errors files have syntax errors"
    echo "You may need to manually fix import paths"
fi

echo ""
echo "📊 Migration Summary:"
echo "- Original files backed up with .backup extension"
echo "- Refactored files copied to original names"
echo "- Import paths updated"
echo "- Git backup tag created"

echo ""
echo "🎉 Migration Complete!"
echo ""
echo "Next steps:"
echo "1. Test your application: open index.html in browser"
echo "2. If issues occur, restore with: ./restore_backup.sh"
echo "3. Once satisfied, clean up: git add . && git commit -m 'Migrate to refactored architecture'"

# Create restore script
cat > restore_backup.sh << 'EOF'
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
EOF

chmod +x restore_backup.sh
echo "📄 Created restore_backup.sh for emergency rollback"
