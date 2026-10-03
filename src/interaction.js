const DIRECTIONS = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  ArrowUp: [0, -1], ArrowDown: [0, 1],
};

export function nudgePortrait(transform, key, fast = false) {
  const direction = DIRECTIONS[key];
  if (!direction) return transform;
  const step = fast ? 0.04 : 0.01;
  const clamp = (value) => Math.max(-0.2, Math.min(1.2, Math.round(value * 100) / 100));
  return {
    ...transform,
    x: clamp(transform.x + direction[0] * step),
    y: clamp(transform.y + direction[1] * step),
  };
}
