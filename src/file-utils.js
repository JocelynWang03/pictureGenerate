const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/bmp']);

export function validateImageFile(file) {
  if (!file || !ACCEPTED_TYPES.has(file.type)) throw new Error('请上传 JPG、PNG、WebP、AVIF、GIF 或 BMP 图片');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('每张图片不能超过 30 MB');
}

export function getOpaqueBounds(pixels, width, height, threshold = 8) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] <= threshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return right < left ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export function loadImageFromBlob(blob) {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('浏览器无法读取这张图片'));
    };
    image.src = url;
  });
}

export function trimTransparentImage(image) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const ratio = Math.min(1, 4096 / Math.max(sourceWidth, sourceHeight));
  const source = document.createElement('canvas');
  source.width = Math.max(1, Math.round(sourceWidth * ratio));
  source.height = Math.max(1, Math.round(sourceHeight * ratio));
  const context = source.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, source.width, source.height);
  const pixels = context.getImageData(0, 0, source.width, source.height).data;
  const bounds = getOpaqueBounds(pixels, source.width, source.height);
  if (!bounds) throw new Error('没有识别到可见的人像，请换一张照片');
  const output = document.createElement('canvas');
  output.width = bounds.width;
  output.height = bounds.height;
  output.getContext('2d').drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
  return output;
}
