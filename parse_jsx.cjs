const fs = require('fs');
const content = fs.readFileSync('src/components/leaderboard/LeaderboardTab.tsx', 'utf8');

// A very naive JSX tag counter
let openTags = [];
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // This is super naive, just to find unclosed divs
    let opens = (line.match(/<div(\s|>)/g) || []).length;
    let closes = (line.match(/<\/div>/g) || []).length;
    
    if (opens > closes) {
        for(let k=0; k < opens - closes; k++) openTags.push(i + 1);
    } else if (closes > opens) {
        for(let k=0; k < closes - opens; k++) {
            if (openTags.length > 0) openTags.pop();
            else console.log("Extra closing div at line", i + 1);
        }
    }
}

console.log("Unclosed divs opened at lines:", openTags);
