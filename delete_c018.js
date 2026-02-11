const fs = require('fs');
const path = 'store/gameStore.ts';
try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split(/\r?\n/);

    // 0-indexed. Line 777 is index 776. Line 977 is index 976.
    const startIdx = 776;
    const endIdx = 976;

    console.log(`Line ${startIdx + 1}:`, lines[startIdx]);
    console.log(`Line ${endIdx + 1}:`, lines[endIdx]);

    if (lines[startIdx].trim().includes('DDD Deviser King Deus Machinex Logic') && lines[endIdx].trim() === '},') {
        const count = endIdx - startIdx + 1;
        lines.splice(startIdx, count);
        fs.writeFileSync(path, lines.join('\n'));
        console.log(`Deleted ${count} lines.`);
    } else {
        console.error('Line mismatch, aborting.');
        process.exit(1);
    }
} catch (e) {
    console.error(e);
    process.exit(1);
}
