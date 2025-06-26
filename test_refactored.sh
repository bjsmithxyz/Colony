#!/bin/bash

# Migration Test Script
echo "🧪 Testing Refactored System..."

# Test 1: Check if all refactored files exist
echo "📁 Checking refactored files..."
REFACTORED_FILES=(
    "js/NodeRefactored.js"
    "js/NodeGrowthManager.js" 
    "js/NodeRenderer.js"
    "js/NodeShapeGenerator.js"
    "js/IndividualRefactored.js"
    "js/IndividualAI.js"
    "js/SimulationRefactored.js"
    "js/SimulationEventHandler.js"
    "js/SimulationRenderer.js"
    "js/ContextMenuManager.js"
    "js/PerformanceMonitor.js"
)

missing_files=0
for file in "${REFACTORED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        ((missing_files++))
    fi
done

if [ $missing_files -eq 0 ]; then
    echo "✅ All refactored files present"
else
    echo "❌ $missing_files files missing"
    exit 1
fi

# Test 2: Check syntax of refactored files
echo -e "\n🔍 Checking JavaScript syntax..."
syntax_errors=0
for file in "${REFACTORED_FILES[@]}"; do
    if node -c "$file" 2>/dev/null; then
        echo "✅ $file syntax OK"
    else
        echo "❌ $file syntax error"
        ((syntax_errors++))
    fi
done

if [ $syntax_errors -eq 0 ]; then
    echo "✅ All files have valid syntax"
else
    echo "❌ $syntax_errors files have syntax errors"
fi

# Test 3: Check import paths
echo -e "\n🔗 Checking import dependencies..."
echo "SimulationRefactored.js imports:"
grep "^import" js/SimulationRefactored.js | head -5

echo -e "\nNodeRefactored.js imports:"
grep "^import" js/NodeRefactored.js

echo -e "\n📊 Summary:"
echo "- Refactored files: ${#REFACTORED_FILES[@]}"
echo "- Missing files: $missing_files"
echo "- Syntax errors: $syntax_errors"

if [ $missing_files -eq 0 ] && [ $syntax_errors -eq 0 ]; then
    echo "🎉 Refactored system is ready for migration!"
    exit 0
else
    echo "⚠️  Issues found - check above for details"
    exit 1
fi
