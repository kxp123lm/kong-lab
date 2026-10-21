import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const manifest = JSON.parse(await readFile(new URL('../docs/game-assets.json',import.meta.url),'utf8'));
for (const [file,expected] of Object.entries(manifest.files)) {
  const bytes = await readFile(new URL('../public/cocos/'+file,import.meta.url));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) throw new Error('Asset integrity mismatch: '+file);
}
for (const file of ['public/cocos/kong-bridge.js','public/cocos/index.html','LICENSE']) await access(new URL('../'+file,import.meta.url));
console.log(`Verified ${Object.keys(manifest.files).length} upstream-derived files; source commit ${manifest.commit}.`);
