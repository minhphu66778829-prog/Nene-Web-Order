(() => {
  const RENDERER_URL = 'https://cdn.jsdelivr.net/npm/block-model-renderer@3.3.0/dist/block-model-renderer.min.js';
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';
  const DEFAULT_VERSION = '1.21.11';
  const preparedAssets = new Map();
  let rendererPromise;

  function getMinecraftVersion(version) {
    const match = /^(\d+\.\d+\.\d+)$/.exec((version || '').trim());
    return match ? match[1] : DEFAULT_VERSION;
  }

  function getRenderer() {
    if (!rendererPromise) {
      rendererPromise = Promise.all([import(RENDERER_URL), import(THREE_URL)]).then(([renderer, THREE]) => {
        renderer.configure({ THREE });
        return renderer;
      });
    }
    return rendererPromise;
  }

  function createVanillaAssets(version) {
    return {
      async read(path) {
        if (!path.startsWith('assets/')) return null;
        const response = await fetch(`https://assets.mcasset.cloud/${version}/${path}`);
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Unable to load Minecraft asset: ${path}`);
        return new Uint8Array(await response.arrayBuffer());
      },
      async list() {
        return [];
      }
    };
  }

  async function getAssets(renderer, pack, mode) {
    const version = getMinecraftVersion(pack.version);
    const key = `${pack.id}:${mode}:${version}`;
    if (preparedAssets.has(key)) return preparedAssets.get(key);

    const sources = [createVanillaAssets(version)];
    if (mode === 'pack' && pack.archiveStored) {
      const archive = await getPackArchive(pack.id);
      if (!archive) throw new Error('Pack ZIP is not available in this browser');
      sources.unshift(archive);
    }

    const assets = await renderer.prepareAssets(sources, { version, cache: true });
    preparedAssets.set(key, assets);
    return assets;
  }

  function dispose(container) {
    container.replaceChildren();
    container.classList.remove('model-preview-error');
  }

  async function render(container, item, pack, mode) {
    dispose(container);
    try {
      if (!item.itemId) throw new Error('This entry has no Minecraft item model');
      const renderer = await getRenderer();
      const assets = await getAssets(renderer, pack, mode);
      const width = Math.max(128, Math.round(container.clientWidth * 1.5));
      const height = Math.max(128, Math.round(container.clientHeight * 1.5));
      const components = mode === 'pack' && item.effect === 'glint'
        ? { enchantments: { sharpness: 1 } }
        : {};
      const canvas = await renderer.renderItem({
        id: item.itemId,
        assets,
        version: getMinecraftVersion(pack.version),
        width,
        height,
        display: { type: 'fallback', display: 'gui' },
        lighting: 'item',
        components
      });
      canvas.setAttribute('aria-label', `Model ${item.name}`);
      canvas.className = 'block-model-canvas';
      container.replaceChildren(canvas);
    } catch (error) {
      container.textContent = 'Không dựng được model item';
      container.classList.add('model-preview-error');
      console.error('block-model-renderer failed to render item.', error);
    }
  }

  window.MinecraftModelPreview = { render, dispose };
})();