const fs = require('fs');
let content = fs.readFileSync('src/components/contractors/ContractorManagementTab.tsx', 'utf8');

// I need to carefully restore the status columns
// The status columns are after the comment /* Columns grouped by Status */

const statusColumnsStart = content.indexOf('/* Columns grouped by Status */');
if (statusColumnsStart > -1) {
    const before = content.substring(0, statusColumnsStart);
    let after = content.substring(statusColumnsStart);
    
    // In the "after" section, I must revert `reqs.` back to `filteredBoardRequirements.`
    after = after.replace(/reqs\.filter\(r => !r\.isInProgress\)/g, 'filteredBoardRequirements.filter(r => !r.isResolved && !r.isInProgress)');
    after = after.replace(/reqs\.filter\(r => r\.isInProgress\)/g, 'filteredBoardRequirements.filter(r => !r.isResolved && r.isInProgress)');
    after = after.replace(/resolvedReqs/g, 'filteredBoardRequirements.filter(r => r.isResolved)');
    
    content = before + after;
    fs.writeFileSync('src/components/contractors/ContractorManagementTab.tsx', content);
}
