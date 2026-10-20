// Integration tests against a real local file with all HTTP(S) blocked.
// CANVAS_PYTHON selects the venv with scripts/canvas-requirements.txt installed.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const temp = await mkdtemp(join(tmpdir(), 'html-artifact-canvas-'));
await mkdir('.canvas-build', { recursive: true });
const scene = JSON.parse(await readFile('assets/ui-canvas/example.json', 'utf8'));
function pack(input, output, check = false, flags = []) {
  return spawnSync(process.env.CANVAS_PYTHON || 'python3', ['scripts/create-ui-canvas.py', input,
    ...(check ? ['--check'] : ['--output', output]), ...flags], { encoding: 'utf8' });
}
let browser;
try {
  const valid = pack('assets/ui-canvas/example.json', join(temp, 'index.html'));
  assert.equal(valid.status, 0, valid.stderr);
  const report = JSON.parse(valid.stdout);
  assert.equal(report.nodes, 83);
  assert.equal(report.cjk_fonts, 2);
  assert.equal(report.font_mode, 'subset');
  assert.ok(report.bytes < 5_000_000, 'Example must stay below 5 MB with subset fonts');
  assert.ok(report.within_publish_limit);
  const full = pack('assets/ui-canvas/example.json', join(temp, 'full.html'), false, ['--full-fonts']);
  assert.equal(full.status, 0, full.stderr);
  assert.ok(report.bytes < JSON.parse(full.stdout).bytes * .6);
  const recovered = pack(join(temp, 'index.html'), join(temp, 'scene.json'), false, ['--extract-scene']);
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.deepEqual(JSON.parse(await readFile(join(temp, 'scene.json'), 'utf8')), scene);
  assert.equal(pack(join(temp, 'scene.json'), join(temp, 'roundtrip.html')).status, 0);
  assert.ok((await readFile(join(temp, 'roundtrip.html'))).equals(await readFile(join(temp, 'index.html'))),
    'Unchanged recovered scene must produce identical HTML');
  const missingTools = spawnSync('python3', ['-S', 'scripts/create-ui-canvas.py',
    'assets/ui-canvas/example.json', '--output', join(temp, 'index.html')], { encoding: 'utf8' });
  assert.notEqual(missingTools.status, 0);
  assert.match(missingTools.stderr, /canvas-requirements.txt/);
  assert.ok((await readFile(join(temp, 'roundtrip.html'))).equals(await readFile(join(temp, 'index.html'))),
    'Missing dependencies must not replace the existing HTML');
  for (const [label, mutate] of [
    ['unknown type', s => { s.artboards[0].type = 'NOPE'; }],
    ['remote image', s => { s.artboards[0].image = 'https://example.com/photo.png'; }],
    ['unsupported glyph', s => { s.artboards[0].children[0].name = '𠀀'; }],
    ['invalid geometry', s => { s.artboards[0].width = -1; }],
  ]) {
    const bad = structuredClone(scene); mutate(bad);
    const input = join(temp, `${label}.json`);
    await writeFile(input, JSON.stringify(bad));
    assert.notEqual(pack(input, null, true).status, 0, label);
  }
  const injected = structuredClone(scene);
  const attack = '</script><script>window.injected=true</script>';
  injected.title = attack;
  injected.artboards[0].children.push({
    type: 'TEXT', name: 'literal text', x: 20, y: 640, width: 600, height: 20, text: attack,
  });
  // A new revision must gain glyphs absent from the original subset.
  injected.artboards[0].children.push({
    type: 'TEXT', name: 'Revision glyphs', x: 450, y: 600, width: 340, height: 32,
    text: '鲸鹿 Café office ffi', fontSize: 22, fontWeight: 500, fill: '#243b32',
  });
  await writeFile(join(temp, 'literal.json'), JSON.stringify(injected));
  assert.equal(pack(join(temp, 'literal.json'), join(temp, 'literal.html')).status, 0);

  browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }),
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const requests = [], errors = [];
  await context.route(/^https?:/, route => { requests.push(route.request().url()); return route.abort(); });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  async function ready(file) {
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => document.body.dataset.ready || document.body.dataset.error, null, { timeout: 30000 });
    assert.equal(await page.getAttribute('body', 'data-ready'), 'true',
      await page.getAttribute('body', 'data-error'));
  }
  async function pixelsForLayer(name) {
    const png = await page.locator('canvas').screenshot();
    return page.evaluate(async ({ png, name }) => {
      const data = Uint8Array.from(atob(png), c => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([data], { type: 'image/png' }));
      const copy = document.createElement('canvas');
      copy.width = bitmap.width; copy.height = bitmap.height;
      const ctx = copy.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
      const { graph, renderer: r } = uiCanvas;
      const node = [...graph.nodes.values()].find(n => n.name === name);
      const pos = graph.getAbsolutePosition(node.id);
      const scale = copy.width / document.querySelector('#design-canvas').clientWidth;
      const x = Math.round((r.panX + pos.x * r.zoom) * scale);
      const y = Math.round((r.panY + pos.y * r.zoom) * scale);
      const w = Math.max(1, Math.floor(node.width * r.zoom * scale));
      const h = Math.max(1, Math.floor(node.height * r.zoom * scale));
      const pixels = ctx.getImageData(x, y, w, h).data;
      let ink = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] < 160 && pixels[i + 1] < 160 && pixels[i + 3] > 0) ink++;
      }
      const offset = (Math.floor(h / 2) * w + Math.floor(w / 2)) * 4;
      return { ink, center: [...pixels.slice(offset, offset + 4)] };
    }, { png: png.toString('base64'), name });
  }
  await ready(join(temp, 'full.html'));
  const layoutSnapshot = () => page.evaluate(() => [...uiCanvas.graph.nodes.values()]
    .map(n => [n.name, n.x, n.y, n.width, n.height]));
  const fullLayout = await layoutSnapshot();
  const fullPixels = await page.locator('canvas').screenshot();
  await writeFile('.canvas-build/full.png', fullPixels);
  await ready(join(temp, 'index.html'));
  const subsetPixels = await page.locator('canvas').screenshot();
  await writeFile('.canvas-build/subset.png', subsetPixels);
  assert.deepEqual(await layoutSnapshot(), fullLayout, 'Subsetting must preserve measured layout');
  const difference = await page.evaluate(async images => {
    const pixels = await Promise.all(images.map(async encoded => {
      const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(encoded), c => c.charCodeAt(0))]));
      const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
      const ctx = c.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
      return ctx.getImageData(0, 0, c.width, c.height).data;
    }));
    let changed = 0, error = 0;
    for (let i = 0; i < pixels[0].length; i += 4) {
      let delta = 0;
      for (let j = 0; j < 4; j++) delta = Math.max(delta, Math.abs(pixels[0][i + j] - pixels[1][i + j]));
      if (delta) changed++;
      error += delta;
    }
    return { changed: changed / (pixels[0].length / 4), meanError: error / (pixels[0].length / 4) };
  }, [fullPixels.toString('base64'), subsetPixels.toString('base64')]);
  // Glyph reindexing/WOFF2 conversion can change edge rasterization, not layout.
  assert.ok(difference.changed < .0025 && difference.meanError < .05,
    `Font subset changed the design: ${JSON.stringify(difference)}`);
  assert.deepEqual(await page.locator('#stage').boundingBox(), { x: 0, y: 0, width: 1440, height: 1000 },
    'The canvas must occupy the entire viewport without editor panels');
  const geometry = await page.evaluate(() => {
    const { graph, renderer: r } = window.uiCanvas;
    const all = [...graph.nodes.values()];
    const layout = all.find(n => n.name === '书架操作');
    return {
      layout: graph.getChildren(layout.id).map(n => n.x),
      unreadable: all.filter(n => n.type === 'TEXT' && r.nodeFontReadiness(n) !== 'ready').map(n => n.text),
    };
  });
  assert.deepEqual(geometry.layout, [0, 90, 180], 'Yoga must position the row children');
  assert.deepEqual(geometry.unreadable, [], 'Every text node must have renderable glyphs');
  assert.ok((await pixelsForLayer('拾页')).ink > 30, 'Chinese text must paint real pixels, not just report ready');
  await page.screenshot({ path: '.canvas-build/desktop.png' });

  // Nested hit testing, viewport fit and actual pointer/keyboard navigation.
  const z = await page.evaluate(() => uiCanvas.renderer.zoom);
  await page.click('#zoom-in');
  await page.waitForFunction(previous => uiCanvas.renderer.zoom > previous, z);
  await page.click('#fit-all');
  const hit = await page.evaluate(() => {
    const { graph, renderer: r } = uiCanvas;
    const n = [...graph.nodes.values()].find(n => n.type === 'TEXT' && n.text === '拾页');
    const abs = graph.getAbsolutePosition(n.id);
    const rect = document.querySelector('canvas').getBoundingClientRect();
    return { id: n.id, x: rect.x + r.panX + (abs.x + 8) * r.zoom, y: rect.y + r.panY + (abs.y + 8) * r.zoom };
  });
  await page.mouse.click(hit.x, hit.y);
  assert.deepEqual(await page.evaluate(() => uiCanvas.selectedIds), [hit.id]);
  const before = await page.evaluate(() => uiCanvas.renderer.panX);
  await page.keyboard.down('Space');
  await page.mouse.move(650, 800); await page.mouse.down();
  await page.mouse.move(720, 800); await page.mouse.up();
  await page.keyboard.up('Space');
  assert.ok(await page.evaluate(x => uiCanvas.renderer.panX > x + 60, before));
  await page.keyboard.press('f');
  await page.keyboard.press('Escape');
  assert.deepEqual(await page.evaluate(() => uiCanvas.selectedIds), []);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => uiCanvas.renderer.viewportWidth === 390);
  await page.click('#fit-all');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  // Tap the mobile frame's blank right margin, then fit the selection.
  const mobile = await page.evaluate(() => {
    const { renderer: r, artboards } = uiCanvas;
    const n = artboards[1];
    return { id: n.id, x: r.panX + (n.x + n.width - 10) * r.zoom,
      y: r.panY + (n.y + 100) * r.zoom };
  });
  await page.mouse.click(mobile.x, mobile.y);
  assert.deepEqual(await page.evaluate(() => uiCanvas.selectedIds), [mobile.id]);
  await page.keyboard.press('Shift+f');
  await page.screenshot({ path: '.canvas-build/mobile.png' });
  const mobileZoom = await page.evaluate(() => uiCanvas.renderer.zoom);
  await page.locator('canvas').focus();
  await page.keyboard.press('+');
  assert.ok(await page.evaluate(z => uiCanvas.renderer.zoom > z, mobileZoom));
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.locator('.outline details').first().getAttribute('open'), '');
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));

  // Embedded raster fills must render too, not merely pass the JSON validator.
  const embeddedImage = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 2; c.height = 2;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, 2, 2);
    return c.toDataURL('image/png');
  });
  injected.artboards[0].children.push({
    type: 'RECTANGLE', name: 'Embedded image', x: 180, y: 600, width: 50, height: 35, image: embeddedImage,
  });
  await writeFile(join(temp, 'literal.json'), JSON.stringify(injected));
  assert.equal(pack(join(temp, 'literal.json'), join(temp, 'literal.html')).status, 0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(join(temp, 'literal.html'));
  assert.equal(await page.evaluate(() => window.injected), undefined);
  assert.equal(await page.title(), attack);
  assert.equal(await page.evaluate(() => [...uiCanvas.graph.nodes.values()].find(n => n.name === 'literal text').text), attack);
  assert.equal(await page.evaluate(() => uiCanvas.renderer.nodeFontReadiness(
    [...uiCanvas.graph.nodes.values()].find(n => n.name === 'Revision glyphs'))), 'ready');
  assert.ok((await pixelsForLayer('Revision glyphs')).ink > 30, 'Added revision glyphs must paint');
  const revisedRecovery = pack(join(temp, 'literal.html'), join(temp, 'revised.json'), false, ['--extract-scene']);
  assert.equal(revisedRecovery.status, 0, revisedRecovery.stderr);
  assert.deepEqual(JSON.parse(await readFile(join(temp, 'revised.json'), 'utf8')), injected,
    'Recovery must preserve script-like literal text, new glyphs and embedded images');
  assert.deepEqual((await pixelsForLayer('Embedded image')).center,
    [255, 0, 255, 255], 'Embedded images must paint their pixels');
  assert.deepEqual(requests, [], 'No HTTP(S) access, including font services');
  assert.deepEqual(errors, [], 'No browser errors');

  // A single copied HTML still works with scripts disabled as a semantic outline.
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJS.newPage();
  await plain.goto(pathToFileURL(join(temp, 'index.html')).href);
  await plain.locator('.outline details').first().locator('summary').click();
  assert.ok((await plain.locator('.outline').innerText()).includes('把日子读慢一点'));
  await noJS.close();
  await context.close();
  console.log('PASS: subset/full render comparison, deterministic HTML recovery, new revision glyphs, offline Skia, Yoga, canvas-only viewport, hit testing, zoom/pan, mobile, embedded images, no-JS outline.');
} finally {
  await browser?.close();
  await rm(temp, { recursive: true, force: true });
}
