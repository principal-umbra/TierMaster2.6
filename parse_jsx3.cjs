const fs = require('fs');
const content = fs.readFileSync('src/components/leaderboard/LeaderboardTab.tsx', 'utf8');

let lines = content.split('\n');
let openTags = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let divStarts = (line.match(/<div/g) || []).length;
    let selfClosing = (line.match(/<div[^>]*\/>/g) || []).length;
    let opens = divStarts - selfClosing;
    let closes = (line.match(/<\/div>/g) || []).length;
    
    if (opens > closes) {
        for(let k=0; k < opens - closes; k++) openTags.push(i + 1);
    } else if (closes > opens) {
        for(let k=0; k < closes - opens; k++) {
            if (openTags.length > 0) {
                let closed = openTags.pop();
                if (closed === 124) {
                    console.log("Main container (line 124) was closed by </div> at line", i + 1);
                }
            } else {
                console.log("Extra closing div at line", i + 1);
            }
        }
    }
}
