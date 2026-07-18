/**
 * Readability audit for the Persian landing copy (what SEO tools grade):
 * flags sentences longer than 20 words.
 */
import { readFileSync } from 'node:fs';

const MAX_WORDS = 20;
const fa = JSON.parse(readFileSync('src/messages/fa.json', 'utf8'));

function walk(node, path, out) {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, out);
}

const strings = [];
walk(fa.landing, 'landing', strings);

const strip = (s) => s.replace(/<\/?[a-z]+>/gi, '').replace(/\{[^}]+\}/g, '');
const words = (s) => strip(s).trim().split(/\s+/).filter(Boolean).length;

let flagged = 0;
for (const [path, value] of strings) {
  // Split on Persian/Latin sentence terminators.
  for (const sentence of strip(value).split(/[.!?؟؛]+/)) {
    const n = words(sentence);
    if (n > MAX_WORDS) {
      flagged++;
      console.log(`${path} — ${n} words:\n   ${sentence.trim()}\n`);
    }
  }
}
console.log(flagged === 0 ? `CLEAN: no landing sentence exceeds ${MAX_WORDS} words.` : `SENTENCES OVER ${MAX_WORDS} WORDS: ${flagged}`);
