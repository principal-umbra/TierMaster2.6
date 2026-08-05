const fs = require('fs');
const file = 'src/components/leaderboard/LeaderboardTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '                  {/* List of dates */}';
const endMarker = '                  </div>\n                </div>\n\n                {/* Right Column */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.log("Could not find markers", startIndex, endIndex);
    process.exit(1);
}

const block = content.substring(startIndex, endIndex);
content = content.replace(block, '');

// insert before </div>\n            </div>\n\n            {/* Footer */}
const insertMarker = '              </div>\n            </div>\n\n            {/* Footer */}';
content = content.replace(insertMarker, `              </div>\n\n${block}            </div>\n\n            {/* Footer */}`);

fs.writeFileSync(file, content, 'utf8');
console.log("Done");
