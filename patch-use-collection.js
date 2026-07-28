/**
 * This script patches all tab files to pass user.organizationName to useCollection calls.
 * Run with: node patch-use-collection.js
 */
const fs = require('fs');
const path = require('path');

const tabsDir = path.join(__dirname, 'components', 'dashboard', 'tabs');
const files = fs.readdirSync(tabsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(tabsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if it uses useCollection
  if (!content.includes("useCollection(")) continue;
  
  // Replace all useCollection('xxx') calls with useCollection('xxx', user?.organizationName)
  const before = content;
  content = content.replace(/useCollection\('([^']+)'\)/g, "useCollection('$1', user?.organizationName)");
  content = content.replace(/useCollection\("([^"]+)"\)/g, 'useCollection("$1", user?.organizationName)');
  
  // If useAuth is not already imported, we don't need to add it (it's already there in most files)
  
  // Special case: in files where `user` is not yet destructured from useAuth,
  // we need to make sure the user variable is accessible.
  // Check if 'const { user }' is already there
  if (!content.includes('const { user }') && !content.includes('{ user,') && !content.includes(', user }') && !content.includes(', user,')) {
    // Check if useAuth is imported but user not destructured
    if (content.includes("useAuth")) {
      // Find existing useAuth destructuring and add user
      content = content.replace(
        /const \{ ([^}]+) \} = useAuth\(\);/g,
        (match, group) => {
          if (!group.includes('user')) {
            return `const { user, ${group} } = useAuth();`;
          }
          return match;
        }
      );
    } else {
      // useAuth not imported at all - add import and destructure
      content = content.replace(
        "import { useCollection } from '@/hooks/useSyncData';",
        "import { useCollection } from '@/hooks/useSyncData';\nimport { useAuth } from '@/lib/auth-context';"
      );
      // Add user destructure near top of component function
      // This is a best-effort - it may need manual review
      content = content.replace(
        /export function \w+\([^)]*\) \{/,
        (match) => match + '\n  const { user } = useAuth();'
      );
    }
  }
  
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Patched: ${file}`);
  } else {
    console.log(`No changes needed: ${file}`);
  }
}

console.log('Done!');
