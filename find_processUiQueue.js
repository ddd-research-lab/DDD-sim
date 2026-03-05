const fs = require('fs');
const path = 'c:\\Users\\denno\\.gemini\\antigravity\\scratch\\yugioh-sim\\store\\gameStore.ts';
try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.includes('processUiQueue:')) {
            console.log(`Found line ${index + 1}: ${line}`);
            // Print next 10 lines
            for (let i = 1; i <= 10; i++) {
                console.log(`${index + 1 + i}: ${lines[index + i]}`);
            }
        }
    });
} catch (err) {
    console.error(err);
}
