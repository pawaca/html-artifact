// Built into vendor/runtime.js.gz. Public OpenPencil APIs only; no app/Vue/editor store.
import { SceneGraph } from '@open-pencil/scene-graph';
import { SkiaRenderer } from '@open-pencil/core/canvas';
import { getCanvasKit } from '@open-pencil/core/canvaskit';
import { fontManager } from '@open-pencil/core/text';
import { layoutAuthoredNodes, setTextMeasurer } from '@open-pencil/core/layout';
import { createSceneGeometry } from '@open-pencil/core/geometry';

const $ = (id) => document.getElementById(id);
const spec = JSON.parse($('scene-data').textContent);
const zh = spec.lang.startsWith('zh');
const say = (en, cn) => zh ? cn : en;
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const urls = [];
let renderer, observer, animation = 0, glHandle, grContext, ck;
let selected = new Set(), hovered = null, disposed = false;
const canvas = $('design-canvas');
const stage = $('stage');
const graph = new SceneGraph();
const page = graph.getPages()[0];
const nodes = new Map();
const color = (hex) => {
  const h = hex.slice(1);
  return { r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255,
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
};
const paint = (hex) => ({ type: 'SOLID', color: color(hex), opacity: 1, visible: true });

function addNode(item, parent) {
  const { children = [], fill, stroke, shadow, layout, image, ...properties } = item;
  const props = { ...properties };
  if (fill) props.fills = [paint(fill)];
  if (stroke) props.strokes = [{ ...paint(stroke.color), weight: stroke.width, align: 'INSIDE' }];
  if (shadow) props.effects = [{
    type: 'DROP_SHADOW', color: color(shadow.color),
    offset: { x: shadow.x, y: shadow.y }, radius: shadow.blur,
    spread: 0, visible: true,
  }];
  if (layout) {
    const padding = Array.isArray(layout.padding) ? layout.padding : Array(4).fill(layout.padding ?? 0);
    Object.assign(props, {
      layoutMode: layout.direction, itemSpacing: layout.gap ?? 0,
      primaryAxisAlign: layout.justify ?? 'MIN', counterAxisAlign: layout.align ?? 'MIN',
      paddingTop: padding[0], paddingRight: padding[1], paddingBottom: padding[2], paddingLeft: padding[3],
      primaryAxisSizing: layout.hug ? 'AUTO' : 'FIXED',
    });
  }
  if (image) {
    const hash = `image-${nodes.size}`;
    graph.images.set(hash, bytes(image.split(',')[1]));
    props.fills = [{ ...paint('#ffffff'), type: 'IMAGE', imageHash: hash, imageScaleMode: 'FILL' }];
  }
  const node = graph.createNode(item.type, parent, props);
  nodes.set(node.id, node);
  children.forEach((child) => addNode(child, node.id));
  return node;
}
const artboards = spec.artboards.map((item) => addNode(item, page.id));

function select(id) {
  selected = new Set(id ? [id] : []);
  requestRender();
}

function render() {
  animation = 0;
  if (!renderer || disposed) return;
  // v0.16's editable selection draws resize/rotation handles. Use its code-focus
  // overlay for this inspection-only host, so the page never advertises inert handles.
  renderer.render(graph, new Set(), { hoveredNodeId: hovered, codeFocusNodeId: [...selected][0] }, 1);
  $('zoom-level').textContent = `${Math.round(renderer.zoom * 100)}%`;
}
function requestRender() {
  if (!animation && !disposed) animation = requestAnimationFrame(render);
}
function fit(targets = artboards) {
  if (!renderer || !targets.length) return;
  const bounds = targets.map(createSceneGeometry(graph).bounds);
  const minX = Math.min(...bounds.map((b) => b.x)), minY = Math.min(...bounds.map((b) => b.y));
  const maxX = Math.max(...bounds.map((b) => b.x + b.width)), maxY = Math.max(...bounds.map((b) => b.y + b.height));
  renderer.zoom = Math.max(.05, Math.min(2,
    (renderer.viewportWidth - 96) / Math.max(1, maxX - minX),
    (renderer.viewportHeight - 112) / Math.max(1, maxY - minY)));
  renderer.panX = (renderer.viewportWidth - (maxX - minX) * renderer.zoom) / 2 - minX * renderer.zoom;
  renderer.panY = (renderer.viewportHeight - (maxY - minY) * renderer.zoom) / 2 - minY * renderer.zoom + 12;
  requestRender();
}
function zoom(factor, x = renderer.viewportWidth / 2, y = renderer.viewportHeight / 2) {
  const next = Math.max(.05, Math.min(8, renderer.zoom * factor));
  const scale = next / renderer.zoom;
  renderer.panX = x - (x - renderer.panX) * scale;
  renderer.panY = y - (y - renderer.panY) * scale;
  renderer.zoom = next;
  requestRender();
}
function local(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function pick(event) {
  const p = local(event);
  return graph.hitTestDeep((p.x - renderer.panX) / renderer.zoom, (p.y - renderer.panY) / renderer.zoom, page.id);
}
function bindInput() {
  let space = false, gesture = null;
  const touches = new Map();
  const pinch = () => {
    const [a, b] = [...touches.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button > 1) return;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') touches.set(e.pointerId, local(e));
    const p = local(e);
    gesture = touches.size === 2 ? { mode: 'pinch', ...pinch() } :
      { mode: space || e.button === 1 || e.pointerType === 'touch' ? 'pan' : 'select',
        x: p.x, y: p.y, startX: p.x, startY: p.y, moved: false };
    if (gesture.mode === 'pan') canvas.classList.add('panning');
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = local(e);
    if (touches.has(e.pointerId)) touches.set(e.pointerId, p);
    if (gesture?.mode === 'pinch' && touches.size === 2) {
      const next = pinch();
      zoom(next.distance / Math.max(1, gesture.distance), gesture.x, gesture.y);
      renderer.panX += next.x - gesture.x;
      renderer.panY += next.y - gesture.y;
      gesture = { mode: 'pinch', ...next };
    } else if (gesture?.mode === 'pan') {
      renderer.panX += p.x - gesture.x;
      renderer.panY += p.y - gesture.y;
      gesture.moved ||= Math.hypot(p.x - gesture.startX, p.y - gesture.startY) > 4;
      gesture.x = p.x; gesture.y = p.y;
    } else if (!gesture) {
      hovered = pick(e)?.id ?? null;
    }
    requestRender();
  });
  function end(e, canceled = false) {
    if (!canceled && (gesture?.mode === 'select' || (gesture?.mode === 'pan' && !gesture.moved))) {
      select(pick(e)?.id ?? null);
    }
    touches.delete(e.pointerId);
    gesture = null;
    canvas.classList.remove('panning');
  }
  canvas.addEventListener('pointerup', (e) => end(e));
  canvas.addEventListener('pointercancel', (e) => end(e, true));
  canvas.addEventListener('lostpointercapture', () => { gesture = null; touches.clear(); canvas.classList.remove('panning'); });
  canvas.addEventListener('pointerleave', () => { hovered = null; requestRender(); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const multiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? renderer.viewportHeight : 1;
    if (e.ctrlKey || e.metaKey) {
      const p = local(e);
      zoom(Math.exp(-e.deltaY * multiplier * .008), p.x, p.y);
    } else {
      renderer.panX -= e.deltaX * multiplier; renderer.panY -= e.deltaY * multiplier;
      requestRender();
    }
  }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space') { space = true; e.preventDefault(); }
    else if (e.key === 'Escape') select(null);
    else if (e.key.toLowerCase() === 'f') {
      fit(e.shiftKey && selected.size ? [...selected].map(id => nodes.get(id)) : artboards);
      e.preventDefault();
    }
    else if (e.key === '+' || e.key === '=') { zoom(1.2); e.preventDefault(); }
    else if (e.key === '-') { zoom(1 / 1.2); e.preventDefault(); }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      renderer.panX += e.key === 'ArrowLeft' ? 40 : e.key === 'ArrowRight' ? -40 : 0;
      renderer.panY += e.key === 'ArrowUp' ? 40 : e.key === 'ArrowDown' ? -40 : 0;
      e.preventDefault(); requestRender();
    }
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space') space = false; });
  window.addEventListener('blur', () => { space = false; gesture = null; touches.clear(); });
  $('fit-all').onclick = () => fit();
  $('zoom-in').onclick = () => zoom(1.2);
  $('zoom-out').onclick = () => zoom(1 / 1.2);
  $('zoom-level').onclick = () => zoom(1 / renderer.zoom);
}

function resize() {
  if (!renderer || disposed) return;
  const w = stage.clientWidth, h = stage.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
  const width = Math.max(1, Math.round(w * dpr)), height = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width; canvas.height = height;
    const surface = ck.MakeOnScreenGLSurface(grContext, width, height, ck.ColorSpace.SRGB);
    if (!surface) throw new Error(say('Cannot resize the drawing surface.', '无法调整绘图表面大小。'));
    renderer.replaceSurface(surface);
  }
  renderer.dpr = dpr; renderer.viewportWidth = w; renderer.viewportHeight = h;
  requestRender();
}

async function start() {
  const packed = JSON.parse($('runtime-assets').textContent);
  const wasm = await window.unpackCanvasAsset(packed.wasm);
  const wasmURL = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));
  urls.push(wasmURL);
  ck = await getCanvasKit({ locateFile: () => wasmURL });
  fontManager.setOnlineFontProviders({ google: false, fontsource: false, bunny: false, fontshare: false });
  const fontURLs = new Map();
  for (const font of packed.fonts) {
    const data = await window.unpackCanvasAsset(font.data);
    const url = URL.createObjectURL(new Blob([data]));
    urls.push(url); fontURLs.set(font.file, url);
    fontManager.markLoaded(font.family, font.style, data.buffer);
    if (font.family === 'Noto Sans SC') fontManager.setCJKFallbackFamily(font.family);
  }
  fontManager.setBundledFontLocator((file) => {
    if (!fontURLs.has(file)) throw new Error(`Font not embedded: ${file}`);
    return fontURLs.get(file);
  });
  canvas.width = Math.max(1, stage.clientWidth); canvas.height = Math.max(1, stage.clientHeight);
  glHandle = ck.GetWebGLContext(canvas, { alpha: 0 });
  if (!glHandle) throw new Error(say('WebGL is unavailable. Open this file in a browser with graphics acceleration enabled.', 'WebGL 不可用，请使用开启图形加速的浏览器打开。'));
  grContext = ck.MakeGrContext(glHandle);
  const surface = grContext && ck.MakeOnScreenGLSurface(grContext, canvas.width, canvas.height, ck.ColorSpace.SRGB);
  if (!surface) throw new Error(say('Cannot create the drawing surface.', '无法创建绘图表面。'));
  renderer = new SkiaRenderer(ck, surface);
  renderer.showRulers = false;
  renderer.pageId = page.id;
  renderer.pageColor = color(spec.background ?? '#e9eaed');
  await renderer.loadFonts(requestRender);
  setTextMeasurer((node, maxWidth) => renderer.measureTextNode(node, maxWidth));
  layoutAuthoredNodes(graph, artboards.map((node) => node.id));
  resize(); fit(); bindInput();
  cancelAnimationFrame(animation);
  render();
  observer = new ResizeObserver(() => { try { resize(); } catch (error) { fail(error); } });
  observer.observe(stage);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(new Error(say('Graphics context lost. Reload to restore the canvas.', '图形上下文已丢失，请刷新恢复画布。'))); });
  $('loading').hidden = true;
  document.body.dataset.ready = 'true';
  window.uiCanvas = { graph, renderer, artboards, select, fit, get selectedIds() { return [...selected]; } };
}
function fail(error) {
  $('loading').hidden = false;
  $('loading').textContent = `${say('Canvas could not load', '画布无法加载')}：${error.message}`;
  document.body.dataset.error = error.message;
  console.error(error);
}
function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(animation); observer?.disconnect();
  renderer?.destroy(); grContext?.delete();
  if (glHandle) ck.deleteContext(glHandle);
  urls.forEach((url) => URL.revokeObjectURL(url));
}
window.addEventListener('pagehide', (event) => { if (!event.persisted) dispose(); });
start().catch(fail);
