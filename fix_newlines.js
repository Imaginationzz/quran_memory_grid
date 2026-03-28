const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'data', 'surahData.js');

let content = fs.readFileSync(dataFile, 'utf8');

// The API strings look like:
// 'Some Arabic text\n',
// We want to remove that \n so it just becomes:
// 'Some Arabic text',
content = content.replace(/\r?\n',/g, "',");

fs.writeFileSync(dataFile, content);
console.log('Fixed newlines in surahData.js');
