const fs = require('fs');
const file = 'src/components/leaderboard/LeaderboardTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '                  {/* 2. Attendance / check-in breakdown */}';
const endMarker = '                  </div>\n                </div>\n              </div>\n\n                  {/* List of dates */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find markers", startIndex, endIndex);
    process.exit(1);
}

const block = content.substring(startIndex, endIndex);
content = content.replace(block, '');

// insert before </div>\n                </div>\n\n                {/* Right Column */}
// Actually, Left Column ends with:
//                  </div>\n                </div>\n                {/* Right Column */}

const insertMarker = '                  </div>\n                </div>\n                {/* Right Column */}';
content = content.replace(insertMarker, `                  </div>\n\n${block}                </div>\n                {/* Right Column */}`);

fs.writeFileSync(file, content, 'utf8');
console.log("Done");
