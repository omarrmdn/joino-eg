
const fs = require('fs');
const content = fs.readFileSync('c:/Users/omar/Documents/Projects/eventaat/src/lib/i18n.tsx', 'utf8');

const enMatch = content.match(/en: \{([\s\S]*?)\},/);
const arMatch = content.match(/ar: \{([\s\S]*?)\},/);
const arEgMatch = content.match(/"ar-EG": \{([\s\S]*?)\},/);

function getKeys(text) {
    if (!text) return [];
    return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.includes(':'))
        .map(line => line.split(':')[0].trim());
}

const enKeys = getKeys(enMatch[1]);
const arKeys = getKeys(arMatch[1]);
const arEgKeys = getKeys(arEgMatch[1]);

console.log(`EN: ${enKeys.length}, AR: ${arKeys.length}, ar-EG: ${arEgKeys.length}`);

const missingInAr = enKeys.filter(k => !arKeys.includes(k));
const missingInArEg = enKeys.filter(k => !arEgKeys.includes(k));

if (missingInAr.length > 0) {
    console.log('Missing in AR:', missingInAr);
}
if (missingInArEg.length > 0) {
    console.log('Missing in ar-EG:', missingInArEg);
}
