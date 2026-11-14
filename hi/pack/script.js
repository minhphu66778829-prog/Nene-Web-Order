// Mật khẩu trang Admin (Bro có thể đổi thành mật khẩu riêng của bro)
const ADMIN_PASSWORD = "1234";

// ========================================================
// 1. DỮ LIỆU PACK GỐC (KHI XUẤT CODE TỪ ADMIN SẼ DÁN ĐÈ VÀO ĐÂY)
// ========================================================
const defaultPacks = [
  {
    id: "dark-gui-v1",
    title: "Obsidian Dark GUI Pack",
    version: "1.20+",
    thumbnail: "https://placehold.co",
    description: "Bộ giao diện tối màu trong suốt giúp nhìn xuyên qua rương và túi đồ.",
    downloadUrl: "https://mediafire.com",
    changes: [
      {
        name: "Túi đồ (Inventory)",
        category: "GUI",
        note: "Nền túi đồ làm trong suốt 70%, viền mỏng màu xanh ngọc.",
        packImg: "https://placehold.co",
        vanillaImg: "https://placehold.co"
      },
      {
        name: "Rương đôi (Double Chest)",
        category: "GUI",
        note: "Tối giản khung rương, dễ nhìn vật phẩm bên trong.",
        packImg: "https://placehold.co",
        vanillaImg: "https://placehold.co"
      }
    ]
  },
  {
    id: "pvp-tools-32x",
    title: "Crimson PvP Tool Pack",
    version: "1.8.9",
    thumbnail: "https://placehold.co",
    description: "Bộ vũ khí và công cụ đào gọn nhẹ tối ưu tầm nhìn khi giao tranh.",
    downloadUrl: "https://google.com",
    changes: [
      {
        name: "Kiếm Kim Cương & Netherite",
        category: "Tool / Weapon",
        note: "Thu ngắn lưỡi kiếm 30% để không che góc nhìn bên phải.",
        packImg: "https://placehold.co",
        vanillaImg: "https://placehold.co"
      }
    ]
  }
];

// Lấy dữ liệu từ bộ nhớ trình duyệt (nếu bro vừa thêm nháp trên Admin) hoặc dùng defaultPacks
let packs = defaultPacks;
try {
  const savedPacks = JSON.parse(localStorage.getItem('mc_custom_packs'));
  if (Array.isArray(savedPacks)) packs = savedPacks;
} catch (error) {
  console.warn('Saved pack data is invalid; using default packs.', error);
}

// ========================================================
// 2. LOGIC CHO TRANG VIEWER (index.html)
// ========================================================
let selectedItem = null;
let selectedPack = null;
let selectedPackArchive = null;

const PACK_ARCHIVE_DB = 'mc-pack-showcase';
const PACK_ARCHIVE_STORE = 'archives';

function openPackArchiveDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PACK_ARCHIVE_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PACK_ARCHIVE_STORE)) {
        request.result.createObjectStore(PACK_ARCHIVE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePackArchive(packId, file) {
  const database = await openPackArchiveDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PACK_ARCHIVE_STORE, 'readwrite');
    transaction.objectStore(PACK_ARCHIVE_STORE).put(file, packId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function getPackArchive(packId) {
  const database = await openPackArchiveDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(PACK_ARCHIVE_STORE, 'readonly')
      .objectStore(PACK_ARCHIVE_STORE).get(packId);
    request.onsuccess = () => {
      database.close();
      resolve(request.result);
    };
    request.onerror = () => {
      database.close();
      reject(request.error);
    };
  });
}

async function removePackArchive(packId) {
  const database = await openPackArchiveDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PACK_ARCHIVE_STORE, 'readwrite');
    transaction.objectStore(PACK_ARCHIVE_STORE).delete(packId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function downloadSavedPack(event, packId, filename) {
  event.preventDefault();
  try {
    const file = await getPackArchive(packId);
    if (!file) throw new Error('Pack archive is missing');
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'resource-pack.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    alert('Không tìm thấy file ZIP đã lưu trên trình duyệt này.');
  }
}

function renderPackList() {
  const list = document.getElementById('pack-list');
  if (!list) return;

  list.innerHTML = packs.map(pack => `
    <div class="pack-card" onclick="openPack('${pack.id}')">
      <img src="${pack.thumbnail}" alt="${pack.title}">
      <div class="pack-card-body">
        <div class="pack-card-top">
          <h3>${pack.title}</h3>
          <span class="badge">${pack.version}</span>
        </div>
        <p>${pack.description}</p>
        <span class="item-count">📦 ${pack.changes.length} mục thay đổi</span>
      </div>
    </div>
  `).join('');
}

async function openPack(packId) {
  const pack = packs.find(p => p.id === packId);
  if (!pack) return;

  let changes = pack.changes || [];
  if (pack.archiveStored && window.JSZip) {
    try {
      const archive = await getPackArchive(pack.id);
      if (archive) {
        const zip = await JSZip.loadAsync(archive);
        const detectedItems = await detectPackItems(zip);
        for (const detected of detectedItems) {
          const existing = changes.find(item => item.name.toLowerCase() === detected.name.toLowerCase());
          if (existing) Object.assign(existing, detected);
          else changes.push({
            ...detected,
            category: detected.effect ? 'Hiệu ứng' : 'Item',
            note: ''
          });
        }
        pack.changes = changes;
        const storedPacks = packs.map(savedPack => savedPack.id === pack.id
          ? {
              ...savedPack,
              changes: changes.map(item => {
                if (!item.texturePath && !item.modelPath) return item;
                const { packImg, modelData, modelTextures, effectTexture, ...storedItem } = item;
                return storedItem;
              })
            }
          : savedPack);
        localStorage.setItem('mc_custom_packs', JSON.stringify(storedPacks));
        renderPackList();
      }
    } catch (error) {
      console.error('Unable to build previews from saved pack.', error);
    }
  }
  document.getElementById('detail-pack-version').innerText = pack.version;
  document.getElementById('detail-pack-title').innerText = pack.title;
  document.getElementById('detail-pack-desc').innerText = pack.description;
  const downloadButton = document.getElementById('pack-download-btn');
  downloadButton.href = pack.downloadUrl || '#';
  downloadButton.onclick = pack.archiveStored && !pack.downloadUrl
    ? event => downloadSavedPack(event, pack.id, pack.archiveName)
    : null;
  downloadButton.setAttribute('aria-disabled', String(!pack.archiveStored && !pack.downloadUrl));

  const itemList = document.getElementById('item-list');
  if (window.MinecraftModelPreview) {
    itemList.querySelectorAll('.item-model-preview').forEach(container => {
      window.MinecraftModelPreview.dispose(container);
    });
  }
  itemList.innerHTML = changes.length ? changes.map((item, idx) => `
    <div class="item-card" onclick="openReview('${pack.id}', ${idx})">
      <div class="model-canvas item-model-preview" data-preview-index="${idx}" aria-label="Model ${item.name}"></div>
      <span class="badge-small">${item.category}</span>
      <h4>${item.name}</h4>
    </div>
  `).join('') : '<p class="empty-state">Chưa có mục so sánh chi tiết cho pack này.</p>';

  document.getElementById('view-packs').classList.add('hidden');
  document.getElementById('view-items').classList.remove('hidden');

  if (window.MinecraftModelPreview) {
    await Promise.all([...itemList.querySelectorAll('.item-model-preview')].map(container => {
      const item = changes[Number(container.dataset.previewIndex)];
      return window.MinecraftModelPreview.render(container, item, pack, 'pack');
    }));
  }

  window.scrollTo(0, 0);
}

function goHome() {
  const viewItems = document.getElementById('view-items');
  const viewPacks = document.getElementById('view-packs');
  if (viewItems && viewPacks) {
    viewItems.classList.add('hidden');
    viewPacks.classList.remove('hidden');
  }
}

function openReview(packId, itemIndex) {
  const pack = packs.find(p => p.id === packId);
  selectedPack = pack;
  selectedItem = pack.changes[itemIndex];

  document.getElementById('review-category').innerText = selectedItem.category;
  document.getElementById('review-title').innerText = selectedItem.name;
  document.getElementById('review-note').innerText = selectedItem.note;

  const toggle = document.getElementById('pack-toggle');
  toggle.checked = true;
  document.getElementById('review-modal').classList.remove('hidden');
  togglePackCompare();
}

async function togglePackCompare() {
  if (!selectedItem) return;
  const isPackOn = document.getElementById('pack-toggle').checked;
  const tagEl = document.getElementById('status-tag');
  tagEl.innerText = isPackOn ? 'ĐANG BẬT PACK' : 'MẶC ĐỊNH (VANILLA)';
  tagEl.className = isPackOn ? 'status-tag on' : 'status-tag off';
  const viewer = document.getElementById('review-model');
  if (window.MinecraftModelPreview) {
    await window.MinecraftModelPreview.render(viewer, selectedItem, selectedPack, isPackOn ? 'pack' : 'vanilla', true);
  }
}

function closeModal(e) {
  if (e.target.id === 'review-modal') forceCloseModal();
}

function forceCloseModal() {
  const modal = document.getElementById('review-modal');
  if (modal) modal.classList.add('hidden');
  if (window.MinecraftModelPreview) {
    window.MinecraftModelPreview.dispose(document.getElementById('review-model'));
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') forceCloseModal();
});

// ========================================================
// 3. LOGIC CHO TRANG ADMIN (admin.html)
// ========================================================
function checkAdminLogin() {
  const pass = document.getElementById('admin-pass').value;
  if (pass === ADMIN_PASSWORD) {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    initAdminPanel();
  } else {
    alert("Sai mật khẩu rồi bro!");
  }
}

function initAdminPanel() {
  const container = document.getElementById('changes-inputs');
  if (container && container.children.length === 0) {
    addChangeInput(); // Thêm sẵn 1 ô nhập mục thay đổi đầu tiên
  }
  renderAdminPackList();
  updateExportBox();
}

function addChangeInput(item = {}) {
  const container = document.getElementById('changes-inputs');
  const index = container.children.length + 1;
  const itemName = typeof item === 'string' ? item : item.name || '';
  const div = document.createElement('div');
  div.className = 'change-input-box';
  div.dataset.texturePath = typeof item === 'object' ? item.texturePath || '' : '';
  div.dataset.itemId = typeof item === 'object' ? item.itemId || '' : '';
  div.dataset.modelPath = typeof item === 'object' ? item.modelPath || '' : '';
  div.dataset.effect = typeof item === 'object' ? item.effect || '' : '';
  div.innerHTML = `
    <div class="change-box-top">
      <span>Mục #${index}</span>
      <button type="button" class="btn-remove-box" onclick="this.parentElement.parentElement.remove()">✕ Xóa mục này</button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Tên món / GUI *</label>
        <input type="text" class="c-name" placeholder="VD: Túi đồ Inventory / Kiếm">
      </div>
      <div class="form-group">
        <label>Phân loại</label>
        <input type="text" class="c-cat" placeholder="VD: GUI hoặc Tool">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Link ảnh BẬT PACK *</label>
        <input type="url" class="c-pack-img" placeholder="https://...png">
      </div>
      <div class="form-group">
        <label>Link ảnh MẶC ĐỊNH (Vanilla) *</label>
        <input type="url" class="c-vanilla-img" placeholder="https://...png">
      </div>
    </div>
    <div class="form-group" style="margin-bottom:0">
      <label>Ghi chú thay đổi</label>
      <input type="text" class="c-note" placeholder="VD: Làm trong suốt nền, thu ngắn kiếm...">
    </div>
  `;
  div.querySelector('.c-name').value = itemName;
  if (div.dataset.texturePath) div.querySelector('.c-name').readOnly = true;
  container.appendChild(div);
}

function getPackDescription(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(getPackDescription).join('');
  if (value && typeof value === 'object') {
    const text = typeof value.text === 'string' ? value.text : '';
    return text + getPackDescription(value.extra || []);
  }
  return '';
}

function formatItemName(name) {
  return name
    .replace(/_(pulling(?:_\d+)?|in_hand|blocking|inventory|cast)$/i, '')
    .split(/[_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function detectPackItems(zip) {
  const files = Object.values(zip.files).filter(file => !file.dir);
  const fileNames = new Map(files.map(file => [file.name.toLowerCase(), file.name]));
  const itemModels = files.filter(file => /^assets\/[^/]+\/models\/item\/.*\.json$/i.test(file.name));
  const detectedItems = new Map();

  for (const modelFile of itemModels) {
    const modelPath = modelFile.name.split('/');
    const namespace = modelPath[1];
    const modelName = modelPath[modelPath.length - 1].replace(/\.json$/i, '');
    let model;

    try {
      model = JSON.parse(await modelFile.async('string'));
    } catch (error) {
      continue;
    }

    const textureMap = model.textures || {};
    const resolveTexture = (reference, visited = new Set()) => {
      if (typeof reference !== 'string') return null;
      if (reference.startsWith('#')) {
        const key = reference.slice(1);
        if (visited.has(key)) return null;
        visited.add(key);
        return resolveTexture(textureMap[key], visited);
      }
      const [textureNamespace, textureName] = reference.includes(':')
        ? reference.split(':', 2)
        : [namespace, reference];
      const normalizedPath = textureName.replace(/^textures\//, '').replace(/\.png$/i, '');
      return fileNames.get(`assets/${textureNamespace}/textures/${normalizedPath}.png`.toLowerCase()) || null;
    };
    const references = [textureMap.particle, ...Object.entries(textureMap)
      .filter(([key]) => key !== 'particle')
      .map(([, value]) => value)];
    const texturePath = references.map(reference => resolveTexture(reference)).find(Boolean);

    if (texturePath) {
      const itemId = modelName.replace(/_(pulling(?:_\d+)?|in_hand|blocking|inventory|cast)$/i, '');
      const name = formatItemName(itemId);
      const previous = detectedItems.get(name);
      if (!previous || modelName === itemId) {
        detectedItems.set(name, { name, itemId, texturePath, modelPath: modelFile.name });
      }
    }
  }

  if (detectedItems.size) return [...detectedItems.values()].sort((a, b) => a.name.localeCompare(b.name));

  const textureItems = files
    .filter(file => /^assets\/[^/]+\/textures\/item\/.*\.png$/i.test(file.name))
    .map(file => {
      const itemId = file.name.split('/').pop().replace(/\.png$/i, '').replace(/_(pulling(?:_\d+)?|in_hand|blocking|inventory|cast)$/i, '');
      return { name: formatItemName(itemId), itemId, texturePath: file.name };
    })
    .filter(item => !/^(Pack|Avatar|Avt)$/i.test(item.name))
    .filter((item, index, items) => items.findIndex(other => other.name === item.name) === index)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (textureItems.length) return textureItems;

  const glintTexture = files.find(file => /\/textures\/misc\/(?:enchanted_item_glint|enchanted_glint_item)\.png$/i.test(file.name));
  return glintTexture
    ? [{ name: 'Hiệu ứng Enchant', itemId: 'diamond_sword', texturePath: glintTexture.name, effect: 'glint' }]
    : [];
}

async function readPackArchive(file) {
  if (!file) return;
  selectedPackArchive = null;

  const status = document.getElementById('pack-upload-status');
  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('error', isError);
  };

  if (!window.JSZip) {
    setStatus('Không tải được bộ đọc ZIP. Hãy kiểm tra kết nối rồi tải lại trang.', true);
    return;
  }

  try {
    const zip = await JSZip.loadAsync(file);
    selectedPackArchive = file;
    const detectedItems = await detectPackItems(zip);
    const changesContainer = document.getElementById('changes-inputs');
    changesContainer.innerHTML = '';
    detectedItems.forEach(item => addChangeInput(item));
    const findEntry = (filename) => Object.values(zip.files)
      .filter(entry => !entry.dir && entry.name.split('/').pop().toLowerCase() === filename)
      .sort((a, b) => a.name.split('/').length - b.name.split('/').length)[0];
    const missing = [];

    document.getElementById('p-title').value = file.name.replace(/\.zip$/i, '').trim();

    const icon = findEntry('pack.png') || findEntry('avatar.png') || findEntry('avt.png');
    if (icon) {
      const base64 = await icon.async('base64');
      const thumbnail = `data:image/png;base64,${base64}`;
      document.getElementById('p-thumb').value = thumbnail;
      const preview = document.getElementById('p-thumb-preview');
      preview.src = thumbnail;
      preview.classList.remove('hidden');
    } else {
      missing.push('pack.png/avatar.png/avt.png');
    }

    const metadataFile = findEntry('pack.mcmeta');
    if (metadataFile) {
      const metadata = JSON.parse(await metadataFile.async('string'));
      const description = getPackDescription(metadata.pack?.description).trim();
      if (description) document.getElementById('p-desc').value = description;
      else missing.push('mô tả trong pack.mcmeta');
    } else {
      missing.push('pack.mcmeta');
    }

    const itemStatus = detectedItems.length
      ? ` Tìm thấy ${detectedItems.length} item có trong pack để so sánh.`
      : ' Không tìm thấy item tùy chỉnh để so sánh.';
    setStatus((missing.length
      ? `Đã đọc tên pack. Không tìm thấy ${missing.join(' và ')}.`
      : 'Đã điền tên, ảnh đại diện và mô tả từ file pack.') + itemStatus);
  } catch (error) {
    setStatus('Không đọc được file ZIP hoặc pack.mcmeta không hợp lệ.', true);
  }
}

async function submitNewPack() {
  const title = document.getElementById('p-title').value.trim();
  const version = document.getElementById('p-version').value.trim();
  const downloadUrl = document.getElementById('p-download').value.trim();
  const thumbnail = document.getElementById('p-thumb').value.trim();
  const description = document.getElementById('p-desc').value.trim();
  const preview = document.getElementById('p-thumb-preview');

  if (!title || !thumbnail || (!downloadUrl && !selectedPackArchive)) {
    alert("Bro cần tên, ảnh đại diện và file ZIP hoặc link tải pack nhé!");
    return;
  }

  const changeBoxes = document.querySelectorAll('.change-input-box');
  const changes = [];

  for (let box of changeBoxes) {
    const name = box.querySelector('.c-name').value.trim();
    const category = box.querySelector('.c-cat').value.trim() || "GUI / Tool";
    const packImg = box.querySelector('.c-pack-img').value.trim();
    const vanillaImg = box.querySelector('.c-vanilla-img').value.trim();
    const note = box.querySelector('.c-note').value.trim();
    const texturePath = box.dataset.texturePath;
    const itemId = box.dataset.itemId;
    const modelPath = box.dataset.modelPath;

    if (name && texturePath) {
      changes.push({
        name,
        category: 'Item',
        note,
        itemId,
        texturePath,
        modelPath,
        effect: box.dataset.effect
      });
    } else if (name && packImg && vanillaImg) {
      changes.push({ name, category, packImg, vanillaImg, note });
    }
  }

  const newPack = {
    id: "pack-" + Date.now(),
    title,
    version: version || "Không rõ",
    thumbnail,
    description,
    downloadUrl,
    changes,
    archiveStored: Boolean(selectedPackArchive),
    archiveName: selectedPackArchive?.name || ''
  };

  try {
    if (selectedPackArchive) await savePackArchive(newPack.id, selectedPackArchive);
    packs.unshift(newPack);
    localStorage.setItem('mc_custom_packs', JSON.stringify(packs));
  } catch (error) {
    packs = packs.filter(pack => pack.id !== newPack.id);
    if (selectedPackArchive) removePackArchive(newPack.id).catch(() => {});
    alert("Không thể lưu pack trong trình duyệt này. Hãy kiểm tra dung lượng lưu trữ.");
    return;
  }

  // Reset form
  selectedPackArchive = null;
  document.getElementById('p-title').value = '';
  document.getElementById('p-version').value = '';
  document.getElementById('p-download').value = '';
  document.getElementById('p-thumb').value = '';
  preview.removeAttribute('src');
  preview.classList.add('hidden');
  document.getElementById('p-desc').value = '';
  document.getElementById('pack-zip').value = '';
  document.getElementById('pack-upload-status').textContent = '';
  document.getElementById('changes-inputs').innerHTML = '';
  addChangeInput();

  renderAdminPackList();
  updateExportBox();
  alert("Đã lưu pack! Mở trang Viewer để xem và tải pack.");
}

function deletePack(packId) {
  if (!confirm("Bro chắc chắn muốn xóa pack này chứ?")) return;
  packs = packs.filter(p => p.id !== packId);
  localStorage.setItem('mc_custom_packs', JSON.stringify(packs));
  removePackArchive(packId).catch(() => {});
  renderAdminPackList();
  updateExportBox();
}
function renderAdminPackList() {
const list = document.getElementById('admin-pack-list');
if (!list) return;
list.innerHTML = packs.map(p => `
  <div class="admin-pack-row">
    <div>
      <h4>${p.title}</h4>
      <span>${p.version} • ${p.changes.length} mục thay đổi</span>
    </div>
    <button class="btn-delete" onclick="deletePack('${p.id}')">Xóa</button>
  </div>
`).join('');
}
function updateExportBox() {
const box = document.getElementById('export-box');
if (!box) return;
const exportPacks = packs.map(({ archiveStored, archiveName, ...pack }) => pack);
box.value = `const defaultPacks = ${JSON.stringify(exportPacks, null, 2)};`;
}
function copyExportCode() {
const box = document.getElementById('export-box');
box.select();
document.execCommand('copy');
alert("Đã copy code! Bro hãy mở file script.js, dán đè lên phần 'const defaultPacks = [...]' ở đầu file và lưu lại nhé.");
}
// Khởi chạy trang Viewer nếu đang ở index.html
renderPackList();