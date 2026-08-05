const fs = require('fs');

let content = fs.readFileSync('src/components/contractors/ContractorManagementTab.tsx', 'utf8');

content = content.replace(/\{filteredBoardRequirements\.filter\(r => !r\.isResolved && !r\.isInProgress\)\.length\}/g, '{reqs.filter(r => !r.isInProgress).length}');
content = content.replace(/filteredBoardRequirements\.filter\(r => !r\.isResolved && !r\.isInProgress\)/g, 'reqs.filter(r => !r.isInProgress)');

content = content.replace(/\{filteredBoardRequirements\.filter\(r => !r\.isResolved && r\.isInProgress\)\.length\}/g, '{reqs.filter(r => r.isInProgress).length}');
content = content.replace(/filteredBoardRequirements\.filter\(r => !r\.isResolved && r\.isInProgress\)/g, 'reqs.filter(r => r.isInProgress)');

// Note that reqs is filtered with `&& !r.isResolved`, so we should make another variable `const resolvedReqs = filteredBoardRequirements.filter(r => r.contractor.id === contractor.id && r.isResolved);`
content = content.replace(/const reqs = filteredBoardRequirements\.filter\(r => r\.contractor\.id === contractor\.id && !r\.isResolved\);/, 
  'const reqs = filteredBoardRequirements.filter(r => r.contractor.id === contractor.id && !r.isResolved);\n                  const resolvedReqs = filteredBoardRequirements.filter(r => r.contractor.id === contractor.id && r.isResolved);');

content = content.replace(/\{filteredBoardRequirements\.filter\(r => r\.isResolved\)\.length\}/g, '{resolvedReqs.length}');
content = content.replace(/filteredBoardRequirements\.filter\(r => r\.isResolved\)/g, 'resolvedReqs');

fs.writeFileSync('src/components/contractors/ContractorManagementTab.tsx', content);
