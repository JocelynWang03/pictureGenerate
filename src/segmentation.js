const DEFAULT_MODULE_URL = 'https://esm.sh/@imgly/background-removal?bundle';

function defaultLoader() {
  const url = globalThis.PORTRAIT_GRID_CONFIG?.moduleUrl || DEFAULT_MODULE_URL;
  return import(url);
}

export async function removePortraitBackground(file, loader = defaultLoader) {
  try {
    const module = await loader();
    const removeBackground = module.removeBackground || module.default;
    if (typeof removeBackground !== 'function') throw new TypeError('抠图模块没有可用的函数');
    const assetPath = globalThis.PORTRAIT_GRID_CONFIG?.assetPath;
    const result = await removeBackground(file, assetPath ? { publicPath: assetPath } : undefined);
    if (!(result instanceof Blob)) throw new TypeError('抠图模块没有返回图片');
    return result;
  } catch (error) {
    throw new Error('自动抠图失败，请检查网络后重试。', { cause: error });
  }
}
