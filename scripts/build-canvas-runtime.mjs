// Maintainer-only build. Generated artifacts need Python stdlib, not npm or this checkout.
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import opentype from 'opentype.js';
import wawoff from 'wawoff2';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const out = 'assets/ui-canvas/vendor';
await mkdir(join(out, 'fonts'), { recursive: true });
const result = await build({
  entryPoints: ['assets/ui-canvas/runtime.js'],
  bundle: true, minify: true, format: 'esm', platform: 'browser',
  target: ['chrome120', 'safari17.4', 'firefox122'],
  external: ['node:*', 'fs', 'path'], // Upstream guarded Node-only branches; never called by this host.
  write: false, metafile: true, legalComments: 'inline',
  outfile: 'runtime.js',
});
const runtime = result.outputFiles[0].contents;
await writeFile(join(out, 'runtime.js.gz'), gzipSync(runtime, { level: 9 }));
const wasm = await readFile('node_modules/canvaskit-wasm/bin/canvaskit.wasm');
await writeFile(join(out, 'canvaskit.wasm.gz'), gzipSync(wasm, { level: 9 }));

const fonts = [];
for (const style of ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold']) {
  const file = `Inter-${style}.ttf`;
  await writeFile(join(out, 'fonts', `${file}.gz`),
    gzipSync(await readFile(`node_modules/@open-pencil/core/assets/${file}`), { level: 9 }));
  fonts.push({ file, family: 'Inter', style });
}
const interData = await readFile('node_modules/@open-pencil/core/assets/Inter-Regular.ttf');
const inter = opentype.parse(interData.buffer.slice(interData.byteOffset, interData.byteOffset + interData.byteLength));
const latinCoverage = Object.keys(inter.tables.cmap.glyphIndexMap).map(Number);
const cjkFonts = [];
let cjkCoverage;
for (const weight of [400, 700]) {
  const file = `noto-sans-sc-chinese-simplified-${weight}-normal.woff2`;
  const data = await readFile(`node_modules/@fontsource/noto-sans-sc/files/${file}`);
  if (weight === 400) {
    const decoded = await wawoff.decompress(data);
    const font = opentype.parse(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength));
    cjkCoverage = Object.keys(font.tables.cmap.glyphIndexMap).map(Number);
  }
  await writeFile(join(out, 'fonts', `${file}.gz`),
    gzipSync(data, { level: 9 }));
  cjkFonts.push({ file, family: 'Noto Sans SC', style: weight === 400 ? 'Regular' : 'Bold' });
}

// Keep full license texts for packages whose code survives tree shaking.
const used = new Set();
for (const output of Object.values(result.metafile.outputs)) {
  for (const [path, input] of Object.entries(output.inputs)) {
    if (!input.bytesInOutput) continue;
    const match = path.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//);
    if (match) used.add(match[1]);
  }
}
used.add('node_modules/canvaskit-wasm');
used.add('node_modules/@fontsource/noto-sans-sc');
let licenses = 'Bundled third-party software and fonts\n\n';
const packages = [];
for (const dir of [...used].sort()) {
  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
  packages.push({ name: pkg.name, version: pkg.version, license: pkg.license });
  const files = await readdir(dir);
  const names = files.filter((name) => /^(licen[cs]e|copying|notice)([.-]|$)/i.test(name));
  licenses += `\n=== ${pkg.name}@${pkg.version} (${pkg.license}) ===\n`;
  if (!names.length && pkg.name === '@open-pencil/yoga-layout') {
    licenses += await readFile('assets/ui-canvas/Yoga-LICENSE.txt', 'utf8');
  } else if (!names.length) throw new Error(`Missing license text: ${pkg.name}`);
  for (const name of names) licenses += `\n${await readFile(join(dir, name), 'utf8')}\n`;
}
licenses += '\n=== Inter (SIL OFL 1.1) ===\n' + await readFile('assets/ui-canvas/Inter-OFL.txt', 'utf8');
await writeFile(join(out, 'LICENSES.txt'), licenses);

const files = ['runtime.js.gz', 'canvaskit.wasm.gz', 'LICENSES.txt',
  ...fonts.map((f) => `fonts/${f.file}.gz`), ...cjkFonts.map((f) => `fonts/${f.file}.gz`)];
// This directory contains build outputs only.
for (const file of await readdir(join(out, 'fonts'))) {
  if (!files.includes(`fonts/${file}`)) await unlink(join(out, 'fonts', file));
}
const hashes = {};
for (const file of files) hashes[file] = createHash('sha256').update(await readFile(join(out, file))).digest('hex');
await writeFile(join(out, 'manifest.json'), JSON.stringify({
  openPencil: '0.16.0', sourceTag: 'v0.16.0', sourceCommit: 'ffe2fc5798468988a5943c5f5737905c3c7a28b5',
  runtimeSourceSha256: createHash('sha256').update(await readFile('assets/ui-canvas/runtime.js')).digest('hex'),
  runtimeBytes: runtime.length, wasmBytes: wasm.length, packages, fonts, latinCoverage, cjkFonts, cjkCoverage, hashes,
}, null, 2) + '\n');
await mkdir('.canvas-build', { recursive: true });
await writeFile('.canvas-build/metafile.json', JSON.stringify(result.metafile, null, 2));
console.log(`Built ${runtime.length} bytes JS, ${wasm.length} bytes WASM; ${cjkCoverage.length} CJK font codepoints.`);
