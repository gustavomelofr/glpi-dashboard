const fs = require('fs');

let content = fs.readFileSync('style.css', 'utf8');
const lines = content.split(/\r?\n/);
const firstLine = lines[0]; // The corrupted part

const buf = Buffer.from(firstLine, 'utf16le');
let recoveredPart = buf.toString('utf8');

// The BOM might be there at the start of recoveredPart
if (recoveredPart.charCodeAt(0) === 0xFEFF) {
    recoveredPart = recoveredPart.substring(1);
}

lines[0] = recoveredPart;
const newContent = lines.join('\n');

fs.writeFileSync('style.css', newContent);
console.log("Recovered!");
