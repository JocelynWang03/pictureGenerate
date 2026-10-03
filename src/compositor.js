import { DEFAULT_MARGINS, getLayout, coverRect } from './layout.js';

export function renderCollage(canvas, { photos, portrait, portraitTransform, size, shadow = 0.5, margins = DEFAULT_MARGINS }) {
  if (!Number.isInteger(size) || size < 100) throw new RangeError('九宫格尺寸至少为 100 像素');
  const { left, top, gap, cellWidth, cellHeight, canvasWidth, canvasHeight } = getLayout(size, margins);
  canvas.width = Math.round(canvasWidth);
  canvas.height = Math.round(canvasHeight);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器无法创建画布');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 9; index += 1) {
    const x = left + (index % 3) * (cellWidth + gap);
    const y = top + Math.floor(index / 3) * (cellHeight + gap);
    const photo = photos[index];
    if (!photo) {
      context.fillStyle = '#f2eee7';
      context.fillRect(x, y, cellWidth, cellHeight);
      continue;
    }
    const width = photo.naturalWidth || photo.width;
    const height = photo.naturalHeight || photo.height;
    const crop = coverRect(width, height, cellWidth, cellHeight);
    context.save();
    context.beginPath();
    context.rect(x, y, cellWidth, cellHeight);
    context.clip();
    context.drawImage(photo, crop.sx, crop.sy, crop.sw, crop.sh, x, y, cellWidth, cellHeight);
    context.restore();
  }

  if (!portrait) return null;
  const portraitWidth = portrait.naturalWidth || portrait.width;
  const portraitHeight = portrait.naturalHeight || portrait.height;
  if (!portraitWidth || !portraitHeight) return null;
  const height = size * portraitTransform.scale;
  const width = height * portraitWidth / portraitHeight;
  const x = left + size * portraitTransform.x - width / 2;
  const y = top + size * portraitTransform.y - height / 2;
  context.save();
  context.shadowColor = `rgba(29, 21, 16, ${0.3 * shadow})`;
  context.shadowBlur = size * 0.018 * shadow;
  context.shadowOffsetX = size * 0.005 * shadow;
  context.shadowOffsetY = size * 0.012 * shadow;
  context.drawImage(portrait, x, y, width, height);
  context.restore();
  return { x, y, width, height };
}
