/**
 * Audit Persian punctuation in user-facing copy:
 *   A) no space *before* . ، ؛ ؟ ! :
 *   B) a space *after* . ، ؛ ؟ ! when a letter follows (mid-sentence)
 * Reports offending strings so they can be fixed by hand.
 */
import { readFileSync } from 'node:fs';

const PERSIAN = /[؀-ۿ]/;
const SPACE_BEFORE = /[ ‌]+[.،؛؟!]/; // includes ZWNJ
const NO_SPACE_AFTER = /[.،؛؟!][؀-ۿA-Za-z]/;

/** Collect every string value in a JSON object, with its dotted key path. */
function walk(node, path, out) {
  if (typeof node === 'string') out.push([path, node]);
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, out);
}

const strings = [];
walk(JSON.parse(readFileSync('src/messages/fa.json', 'utf8')), '', strings);

// Persian string literals inside the TS content modules.
for (const file of ['src/lib/legal.ts', 'src/lib/blog.ts']) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) {
    const s = m[1] ?? m[2] ?? '';
    if (PERSIAN.test(s)) strings.push([`${file}:${s.slice(0, 28)}…`, s]);
  }
}

let issues = 0;
for (const [path, s] of strings) {
  if (!PERSIAN.test(s)) continue;
  // Ignore ellipses ("...") and ICU placeholders.
  const clean = s.replace(/\.\.\./g, '…');
  if (SPACE_BEFORE.test(clean)) {
    issues++;
    console.log(`[space-before-punct] ${path}\n   ${s}\n`);
  }
  const m = clean.match(NO_SPACE_AFTER);
  // A period directly before a letter is only wrong mid-sentence, not in
  // decimals/URLs/domains — skip those.
  if (m && !/\d[.,]\d|https?:|www\.|@|\.(ir|com|app|net)/i.test(s)) {
    issues++;
    console.log(`[no-space-after-punct] ${path} → "${m[0]}"\n   ${s}\n`);
  }
}
console.log(issues === 0 ? 'CLEAN: no Persian punctuation issues found.' : `TOTAL ISSUES: ${issues}`);
