/**
 * Fixed patch script: moves user extraction BEFORE useCollection calls.
 * Run with: node patch-use-collection-v2.js
 */
const fs = require('fs');
const path = require('path');

const tabsDir = path.join(__dirname, 'components', 'dashboard', 'tabs');
const files = fs.readdirSync(tabsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(tabsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Only process files using useCollection
  if (!content.includes("useCollection(")) continue;
  
  // Step 1: Find where the component function starts (e.g. "export function FooTab(")
  const funcMatch = content.match(/export function \w+\([^)]*\) \{/);
  if (!funcMatch) {
    console.log(`Skipping ${file} - could not find component function`);
    continue;
  }
  const funcIdx = content.indexOf(funcMatch[0]);
  const funcBodyStart = funcIdx + funcMatch[0].length;

  // Step 2: Find current useAuth destructuring line (if any)
  const useAuthDestructureMatch = content.match(/\n\s*const \{([^}]+)\} = useAuth\(\);/);
  
  // Step 3: Check if 'user' is already in the useAuth destructure
  let newContent = content;
  
  if (useAuthDestructureMatch) {
    const fullMatch = useAuthDestructureMatch[0];
    const fields = useAuthDestructureMatch[1];
    
    // Remove the existing useAuth line
    newContent = newContent.replace(fullMatch, '');
    
    // Add 'user' to fields if not present
    let newFields = fields.trim();
    if (!newFields.includes('user')) {
      newFields = 'user, ' + newFields;
    }
    
    // Inject the useAuth line RIGHT after the function opening brace
    const insertPoint = funcBodyStart;
    newContent = newContent.slice(0, insertPoint) + `\n  const { ${newFields} } = useAuth();` + newContent.slice(insertPoint);
  } else if (content.includes('useAuth')) {
    // useAuth is imported but no destructure yet — add one
    const insertPoint = funcBodyStart;
    newContent = newContent.slice(0, insertPoint) + `\n  const { user } = useAuth();` + newContent.slice(insertPoint);
  } else {
    // useAuth not imported at all
    newContent = newContent.replace(
      "import { useCollection } from '@/hooks/useSyncData';",
      "import { useCollection } from '@/hooks/useSyncData';\nimport { useAuth } from '@/lib/auth-context';"
    );
    const insertPoint = newContent.indexOf(funcMatch[0]) + funcMatch[0].length;
    newContent = newContent.slice(0, insertPoint) + `\n  const { user } = useAuth();` + newContent.slice(insertPoint);
  }
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Patched: ${file}`);
  } else {
    console.log(`No changes needed: ${file}`);
  }
}

console.log('Done!');
