const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all files with misplaced "use client" directives
const srcDir = path.resolve(__dirname, '../src');
const files = glob.sync('**/*.{ts,tsx}', { cwd: srcDir });

let fixedCount = 0;

files.forEach(relativePath => {
  const filePath = path.join(srcDir, relativePath);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if file has "use client" not at the top
  const lines = content.split('\n');
  let useClientIndex = -1;
  let firstNonEmptyIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '"use client";') {
      useClientIndex = i;
    }
    if (line && firstNonEmptyIndex === -1 && line !== '"use client";') {
      firstNonEmptyIndex = i;
    }
  }

  // If "use client" exists but is not at the top, fix it
  if (useClientIndex !== -1 && useClientIndex !== 0) {
    // Remove "use client" from its current position
    lines.splice(useClientIndex, 1);

    // Add "use client" at the top
    lines.unshift('"use client";', '');

    // Write the fixed content
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Fixed: ${relativePath}`);
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files`);