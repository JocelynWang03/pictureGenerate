import { replacePhotos, swapSlots } from './order.js';
import { renderCollage } from './compositor.js';
import { removePortraitBackground } from './segmentation.js';
import { loadImageFromBlob, trimTransparentImage, validateImageFile } from './file-utils.js';
import { nudgePortrait } from './interaction.js';
import { createUploadRequests } from './upload-requests.js';
import { DEFAULT_MARGINS, getLayout } from './layout.js';

const PREVIEW_GRID_SIZE = 1200;

const $ = (selector) => document.querySelector(selector);
const elements = {
  gridInput: $('#grid-files'), slotInput: $('#slot-file'), slotList: $('#slot-list'), gridCount: $('#grid-count'),
  portraitInput: $('#portrait-file'), portraitThumb: $('#portrait-thumb'), portraitName: $('#portrait-name'),
  portraitState: $('#portrait-state'), retry: $('#retry-cutout'), scale: $('#portrait-scale'), scaleValue: $('#scale-value'),
  shadow: $('#shadow-strength'), shadowValue: $('#shadow-value'), reset: $('#reset-position'),
  canvas: $('#preview-canvas'), previewStatus: $('#preview-status'), completionHint: $('#completion-hint'),
  size: $('#export-size'), finalSize: $('#final-size'), png: $('#export-png'), jpg: $('#export-jpg'), toast: $('#toast'),
};
const marginControls = Object.fromEntries(['top', 'right', 'bottom', 'left'].map((side) => [side, {
  input: $(`#margin-${side}`), output: $(`#margin-${side}-value`),
}]));

const state = {
  slots: Array(9).fill(null), portraitFile: null, portraitPreviewUrl: null, portrait: null,
  transform: { x: 0.56, y: 0.59, scale: 0.75 }, shadow: 0.7, margins: { ...DEFAULT_MARGINS },
  processing: false, exporting: false, selectedSlot: null, replacingSlot: null,
  cutoutToken: 0, portraitBounds: null,
};
const uploadRequests = createUploadRequests();

let toastTimer;
let pointerStart;

function showToast(message, error = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle('error', error);
  elements.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 4500);
}

function releaseEntry(entry) {
  if (entry?.url) URL.revokeObjectURL(entry.url);
}

function updateStatus() {
  const count = state.slots.filter(Boolean).length;
  const ready = count === 9 && !!state.portrait && !state.processing;
  elements.gridCount.textContent = `${count} / 9`;
  elements.previewStatus.textContent = state.processing ? '正在自动抠图…' : ready ? '可以导出' : `已准备 ${count} / 9 张底图`;
  elements.previewStatus.classList.toggle('ready', ready);
  elements.completionHint.textContent = state.processing ? '人像处理中，请稍候' : ready ? '作品已就绪，选择尺寸和格式保存' : '上传九张底图和一张人物照片后即可导出';
  elements.png.disabled = !ready || state.exporting;
  elements.jpg.disabled = !ready || state.exporting;
  elements.retry.hidden = !state.portraitFile || state.processing || !!state.portrait;
  elements.canvas.classList.toggle('can-drag', !!state.portrait);
}

function redraw() {
  const layout = getLayout(PREVIEW_GRID_SIZE, state.margins);
  elements.canvas.parentElement.style.setProperty('--preview-ratio', String(layout.canvasWidth / layout.canvasHeight));
  state.portraitBounds = renderCollage(elements.canvas, {
    photos: state.slots.map((entry) => entry?.image ?? null),
    portrait: state.portrait,
    portraitTransform: state.transform,
    size: PREVIEW_GRID_SIZE,
    shadow: state.shadow,
    margins: state.margins,
  });
  updateFinalSize();
  updateStatus();
}

function updateFinalSize() {
  const layout = getLayout(Number(elements.size.value), state.margins);
  elements.finalSize.textContent = `成品 ${Math.round(layout.canvasWidth)} × ${Math.round(layout.canvasHeight)} 像素`;
}

function renderSlots() {
  elements.slotList.replaceChildren();
  state.slots.forEach((entry, index) => {
    const slot = document.createElement('li');
    slot.className = `slot-card${state.selectedSlot === index ? ' selected' : ''}`;
    slot.dataset.index = String(index);
    slot.tabIndex = 0;
    slot.setAttribute('role', 'button');
    slot.setAttribute('aria-label', `第 ${index + 1} 格，${entry ? entry.file.name : '空位'}。点选两格可交换`);
    slot.draggable = !!entry;
    if (entry) {
      const image = document.createElement('img');
      image.src = entry.url;
      image.alt = '';
      slot.append(image);
    } else {
      const empty = document.createElement('span');
      empty.className = 'slot-empty';
      empty.textContent = '+';
      slot.append(empty);
    }
    const number = document.createElement('span');
    number.className = 'slot-number';
    number.textContent = String(index + 1).padStart(2, '0');
    slot.append(number);
    const replace = document.createElement('button');
    replace.type = 'button';
    replace.className = 'slot-replace';
    replace.textContent = entry ? '更换' : '添加';
    replace.setAttribute('aria-label', `${entry ? '更换' : '添加'}第 ${index + 1} 格照片`);
    replace.addEventListener('click', (event) => {
      event.stopPropagation();
      state.replacingSlot = index;
      elements.slotInput.click();
    });
    slot.append(replace);
    elements.slotList.append(slot);
  });
  redraw();
}

function chooseSlot(index) {
  if (state.selectedSlot === null) {
    state.selectedSlot = index;
    showToast(`已选第 ${index + 1} 格，再点一格即可交换`);
  } else if (state.selectedSlot === index) {
    state.selectedSlot = null;
  } else {
    uploadRequests.beginReorder();
    state.slots = swapSlots(state.slots, state.selectedSlot, index);
    state.selectedSlot = null;
  }
  renderSlots();
}

elements.slotList.addEventListener('click', (event) => {
  const slot = event.target.closest('.slot-card');
  if (slot) chooseSlot(Number(slot.dataset.index));
});
elements.slotList.addEventListener('keydown', (event) => {
  if (event.target.classList.contains('slot-card') && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    chooseSlot(Number(event.target.dataset.index));
  }
});
elements.slotList.addEventListener('dragstart', (event) => {
  const slot = event.target.closest('.slot-card');
  if (!slot || !state.slots[Number(slot.dataset.index)]) return;
  event.dataTransfer.setData('text/plain', slot.dataset.index);
  event.dataTransfer.effectAllowed = 'move';
  slot.classList.add('dragging');
});
elements.slotList.addEventListener('dragend', (event) => event.target.closest('.slot-card')?.classList.remove('dragging'));
elements.slotList.addEventListener('dragover', (event) => {
  const slot = event.target.closest('.slot-card');
  if (slot) { event.preventDefault(); slot.classList.add('drag-over'); }
});
elements.slotList.addEventListener('dragleave', (event) => event.target.closest('.slot-card')?.classList.remove('drag-over'));
elements.slotList.addEventListener('drop', (event) => {
  const slot = event.target.closest('.slot-card');
  if (!slot) return;
  event.preventDefault();
  const from = Number(event.dataTransfer.getData('text/plain'));
  const to = Number(slot.dataset.index);
  if (Number.isInteger(from) && from >= 0 && from < 9 && from !== to) {
    uploadRequests.beginReorder();
    state.slots = swapSlots(state.slots, from, to);
    state.selectedSlot = null;
    renderSlots();
  }
});

elements.gridInput.addEventListener('change', async () => {
  const files = Array.from(elements.gridInput.files ?? []);
  elements.gridInput.value = '';
  if (!files.length) return;
  try {
    if (files.length > 9) throw new Error('九宫格最多选择 9 张照片');
    files.forEach(validateImageFile);
    const token = uploadRequests.beginBulk();
    const results = await Promise.allSettled(files.map(async (file) => ({ file, ...(await loadImageFromBlob(file)) })));
    const loaded = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
    if (!uploadRequests.isBulkCurrent(token)) { loaded.forEach(releaseEntry); return; }
    const failure = results.find((result) => result.status === 'rejected');
    if (failure) { loaded.forEach(releaseEntry); throw failure.reason; }
    state.slots.forEach(releaseEntry);
    state.slots = replacePhotos(state.slots, loaded);
    state.selectedSlot = null;
    renderSlots();
    showToast(`已加入 ${files.length} 张九宫格照片`);
  } catch (error) { showToast(error.message, true); }
});

elements.slotInput.addEventListener('change', async () => {
  const file = elements.slotInput.files?.[0];
  elements.slotInput.value = '';
  const index = state.replacingSlot;
  state.replacingSlot = null;
  if (!file || index === null) return;
  let token;
  try {
    validateImageFile(file);
    token = uploadRequests.beginSlot(index);
    const loaded = { file, ...(await loadImageFromBlob(file)) };
    if (!uploadRequests.isSlotCurrent(index, token)) { releaseEntry(loaded); return; }
    releaseEntry(state.slots[index]);
    state.slots[index] = loaded;
    renderSlots();
  } catch (error) {
    if (token && !uploadRequests.isSlotCurrent(index, token)) return;
    showToast(error.message, true);
  }
});

async function processPortrait() {
  if (!state.portraitFile) return;
  const token = ++state.cutoutToken;
  state.processing = true;
  state.portrait = null;
  elements.portraitState.textContent = '正在自动抠出人像，首次使用可能需要下载模型…';
  redraw();
  try {
    const result = await removePortraitBackground(state.portraitFile);
    const loaded = await loadImageFromBlob(result);
    let trimmed;
    try { trimmed = trimTransparentImage(loaded.image); }
    finally { URL.revokeObjectURL(loaded.url); }
    if (token !== state.cutoutToken) return;
    state.portrait = trimmed;
    elements.portraitState.textContent = '抠图完成，可在画面上拖动人物';
    showToast('人像抠图完成');
  } catch (error) {
    if (token !== state.cutoutToken) return;
    elements.portraitState.textContent = error.message;
    showToast(error.message, true);
  } finally {
    if (token === state.cutoutToken) { state.processing = false; redraw(); }
  }
}

elements.portraitInput.addEventListener('change', () => {
  const file = elements.portraitInput.files?.[0];
  elements.portraitInput.value = '';
  if (!file) return;
  try { validateImageFile(file); }
  catch (error) { showToast(error.message, true); return; }
  ++state.cutoutToken;
  if (state.portraitPreviewUrl) URL.revokeObjectURL(state.portraitPreviewUrl);
  state.portraitFile = file;
  state.portraitPreviewUrl = URL.createObjectURL(file);
  state.portrait = null;
  elements.portraitThumb.replaceChildren();
  const thumb = document.createElement('img');
  thumb.src = state.portraitPreviewUrl;
  thumb.alt = '';
  elements.portraitThumb.append(thumb);
  elements.portraitName.textContent = file.name;
  processPortrait();
});
elements.retry.addEventListener('click', processPortrait);

for (const [side, control] of Object.entries(marginControls)) {
  control.input.addEventListener('input', () => {
    state.margins[side] = Number(control.input.value) / 100;
    control.output.textContent = `${control.input.value}%`;
    redraw();
  });
}
elements.size.addEventListener('change', updateFinalSize);
elements.scale.addEventListener('input', () => {
  state.transform.scale = Number(elements.scale.value) / 100;
  elements.scaleValue.textContent = `${elements.scale.value}%`;
  redraw();
});
elements.shadow.addEventListener('input', () => {
  state.shadow = Number(elements.shadow.value) / 100;
  elements.shadowValue.textContent = `${elements.shadow.value}%`;
  redraw();
});
elements.reset.addEventListener('click', () => {
  state.transform.x = 0.56;
  state.transform.y = 0.59;
  redraw();
});

elements.canvas.addEventListener('pointerdown', (event) => {
  const bounds = state.portraitBounds;
  if (!bounds) return;
  const rect = elements.canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * elements.canvas.width / rect.width;
  const y = (event.clientY - rect.top) * elements.canvas.height / rect.height;
  if (x < bounds.x || x > bounds.x + bounds.width || y < bounds.y || y > bounds.y + bounds.height) return;
  pointerStart = { clientX: event.clientX, clientY: event.clientY, x: state.transform.x, y: state.transform.y };
  elements.canvas.setPointerCapture(event.pointerId);
  elements.canvas.classList.add('dragging');
});
elements.canvas.addEventListener('pointermove', (event) => {
  if (!pointerStart) return;
  const rect = elements.canvas.getBoundingClientRect();
  state.transform.x = Math.max(-0.2, Math.min(1.2, pointerStart.x + (event.clientX - pointerStart.clientX) * elements.canvas.width / rect.width / PREVIEW_GRID_SIZE));
  state.transform.y = Math.max(-0.2, Math.min(1.2, pointerStart.y + (event.clientY - pointerStart.clientY) * elements.canvas.height / rect.height / PREVIEW_GRID_SIZE));
  redraw();
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  elements.canvas.addEventListener(name, () => { pointerStart = null; elements.canvas.classList.remove('dragging'); });
}
elements.canvas.addEventListener('keydown', (event) => {
  if (!state.portrait || !event.key.startsWith('Arrow')) return;
  event.preventDefault();
  state.transform = nudgePortrait(state.transform, event.key, event.shiftKey);
  redraw();
});

async function exportImage(format) {
  if (state.exporting || state.slots.some((entry) => !entry) || !state.portrait) return;
  state.exporting = true;
  updateStatus();
  try {
    const size = Number(elements.size.value);
    const canvas = document.createElement('canvas');
    renderCollage(canvas, {
      photos: state.slots.map((entry) => entry.image), portrait: state.portrait,
      portraitTransform: state.transform, size, shadow: state.shadow, margins: state.margins,
    });
    const type = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('图片导出失败')), type, 0.93));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `立体九宫格-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    showToast(`${format.toUpperCase()} 图片已开始下载`);
  } catch (error) { showToast(error.message, true); }
  finally { state.exporting = false; updateStatus(); }
}
elements.png.addEventListener('click', () => exportImage('png'));
elements.jpg.addEventListener('click', () => exportImage('jpg'));
window.addEventListener('beforeunload', () => {
  state.slots.forEach(releaseEntry);
  if (state.portraitPreviewUrl) URL.revokeObjectURL(state.portraitPreviewUrl);
});

renderSlots();
