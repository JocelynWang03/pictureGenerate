export const DEFAULT_MARGINS = Object.freeze({ top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 });

export function getLayout(size, margins = DEFAULT_MARGINS) {
  if (!Number.isFinite(size) || size <= 0) throw new RangeError('九宫格尺寸必须大于零');
  const sides = ['top', 'right', 'bottom', 'left'];
  if (sides.some((side) => !Number.isFinite(margins?.[side]) || margins[side] < 0 || margins[side] > 0.2)) {
    throw new RangeError('四边白边距比例须在 0% 到 20% 之间');
  }
  const top = size * margins.top;
  const right = size * margins.right;
  const bottom = size * margins.bottom;
  const left = size * margins.left;
  const gap = size * 0.01;
  return {
    top, right, bottom, left, gap,
    canvasWidth: size + left + right,
    canvasHeight: size + top + bottom,
    cellWidth: (size - 2 * gap) / 3,
    cellHeight: (size - 2 * gap) / 3,
  };
}

export function coverRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  if ([sourceWidth, sourceHeight, targetWidth, targetHeight].some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError('图片尺寸必须大于零');
  }
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const sw = sourceHeight * targetRatio;
    return { sx: (sourceWidth - sw) / 2, sy: 0, sw, sh: sourceHeight };
  }
  const sh = sourceWidth / targetRatio;
  return { sx: 0, sy: (sourceHeight - sh) / 2, sw: sourceWidth, sh };
}
