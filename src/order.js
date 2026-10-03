const SLOT_COUNT = 9;

export function replacePhotos(_previous, files) {
  const next = Array.from(files);
  if (next.length > SLOT_COUNT) throw new RangeError('底图最多上传 9 张');
  return Array.from({ length: SLOT_COUNT }, (_, index) => next[index] ?? null);
}

export function swapSlots(slots, first, second) {
  if (slots.length !== SLOT_COUNT || ![first, second].every((index) => Number.isInteger(index) && index >= 0 && index < SLOT_COUNT)) {
    throw new RangeError('无效的九宫格位置');
  }
  const next = [...slots];
  [next[first], next[second]] = [next[second], next[first]];
  return next;
}
