const fs = require('fs');
const content = fs.readFileSync('store/gameStore.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes("'c025':")) {
        console.log(`Line ${i + 1}: ${line.trim()}`);
    }
});
