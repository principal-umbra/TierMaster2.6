const fs = require('fs');
const content = fs.readFileSync('src/components/leaderboard/LeaderboardTab.tsx', 'utf8');

let lines = content.split('\n');
let openTags = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // ignore self-closing divs
    let opensMatch = line.match(/<div(\s[^>]*?[^\/]>|>)/g);
    let opens = opensMatch ? opensMatch.length : 0;
    
    // some divs might be like <div ... > with no attributes ending with /
    // let's do this: count `<div` that are not `<div ... />`
    let divStarts = (line.match(/<div/g) || []).length;
    let selfClosing = (line.match(/<div[^>]*\/>/g) || []).length;
    opens = divStarts - selfClosing;
    
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
