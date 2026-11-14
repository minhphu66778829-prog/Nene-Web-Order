let skins = JSON.parse(localStorage.getItem('my_mc_skins')) || [];
let currentSkin = null;
let modalViewer = null;
let isSlim = false;

// Hàm xử lý ảnh: Tự động xóa nền đen tuyền (do tải từ FB/Zalo) thành trong suốt và nhận diện Slim/Classic
function processSkinImage(skinSrc, callback) {
    const img = new Image();
    img.onload = function() {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const data = imgData.data;

        // Kiểm tra góc trên cùng bên trái (0,0) - vùng luôn luôn trống trên mọi skin Minecraft
        const isBlackBackground = (data === 0 && data === 0 && data === 0 && data === 255);

        // Nếu ảnh bị dính nền đen tuyền, tự động biến tất cả pixel đen tuyền thành trong suốt
        if (isBlackBackground) {
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
                    data[i + 3] = 0; // Xóa thành trong suốt
                }
            }
            ctx.putImageData(imgData, 0, 0);
        }

        // Kiểm tra độ trong suốt ở cột pixel rìa cánh tay (x=50, y=20 theo chuẩn 64x64) để nhận diện Slim
        const scale = img.width / 64;
        const armPixel = ctx.getImageData(Math.floor(50 * scale), Math.floor(20 * scale), 1, 1).data;
        const detectedSlim = (armPixel === 0);

        callback(c.toDataURL('image/png'), detectedSlim);
    };
    img.src = skinSrc;
}

document.getElementById('skinFileInput').addEventListener('change', function(e) {
    const file = e.target.files.item(0);
    if (file) {
        document.getElementById('fileLabelText').innerText = "📄 " + file.name;
        const nameInput = document.getElementById('skinNameInput');
        if (!nameInput.value) {
            nameInput.value = file.name.replace(/\.png$/i, '');
        }
    }
});

function uploadSkin() {
    const fileInput = document.getElementById('skinFileInput');
    const nameInput = document.getElementById('skinNameInput');
    const file = fileInput.files.item(0);

    if (!file) {
        alert("Bạn chưa chọn file ảnh (.png) nào!");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const rawBase64 = event.target.result;
        processSkinImage(rawBase64, function(cleanBase64, detectedSlim) {
            generateThumbnail(cleanBase64, detectedSlim, function(thumbnailData) {
                const newSkin = {
                    id: Date.now(),
                    name: nameInput.value.trim() || "Skin chưa đặt tên",
                    skinData: cleanBase64,
                    thumbData: thumbnailData,
                    isSlim: detectedSlim
                };
                skins.unshift(newSkin);
                try {
                    localStorage.setItem('my_mc_skins', JSON.stringify(skins));
                } catch (err) {
                    alert("Bộ nhớ trình duyệt đã đầy!");
                    skins.shift();
                    return;
                }
                renderGallery();

                fileInput.value = "";
                nameInput.value = "";
                document.getElementById('fileLabelText').innerText = "📁 Chọn file Skin (.png)";
            });
        });
    };
    reader.readAsDataURL(file);
}

function generateThumbnail(skinSrc, detectedSlim, callback) {
    if (typeof skinview3d === 'undefined') {
        callback(skinSrc);
        return;
    }

    const tempCanvas = document.createElement('canvas');
    const tempViewer = new skinview3d.SkinViewer({
        canvas: tempCanvas,
        width: 150,
        height: 200,
        skin: skinSrc,
        model: detectedSlim ? "slim" : "default"
    });
    tempViewer.camera.position.set(-20, 15, 32);
    tempViewer.camera.lookAt(0, 0, 0);

    setTimeout(function() {
        tempViewer.render();
        const dataUrl = tempCanvas.toDataURL();
        tempViewer.dispose();
        callback(dataUrl);
    }, 250);
}

function renderGallery() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    if (skins.length === 0) {
        const p = document.createElement('p');
        p.className = 'empty-msg';
        p.innerText = 'Chưa có skin nào. Hãy dùng thanh bên dưới để tải file .png lên nhé!';
        gallery.appendChild(p);
        return;
    }

    skins.forEach(function(skin) {
        const card = document.createElement('div');
        card.className = 'skin-card';
        card.onclick = function() { openViewer(skin.id); };

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.title = 'Xóa skin';
        delBtn.innerText = '✕';
        delBtn.onclick = function(e) { deleteSkin(e, skin.id); };

        const img = document.createElement('img');
        img.src = skin.thumbData;
        img.alt = skin.name;

        const nameDiv = document.createElement('div');
        nameDiv.className = 'skin-name';
        nameDiv.innerText = skin.name;

        card.appendChild(delBtn);
        card.appendChild(img);
        card.appendChild(nameDiv);
        gallery.appendChild(card);
    });
}

function deleteSkin(event, id) {
    event.stopPropagation();
    if (confirm("Bạn có chắc muốn xóa skin này?")) {
        skins = skins.filter(function(s) { return s.id !== id; });
        localStorage.setItem('my_mc_skins', JSON.stringify(skins));
        renderGallery();
    }
}

function openViewer(id) {
    if (typeof skinview3d === 'undefined') {
        alert("Không tìm thấy file skinview3d.bundle.js trong thư mục!");
        return;
    }

    currentSkin = skins.find(function(s) { return s.id === id; });
    if (!currentSkin) return;

    document.getElementById('modalTitle').innerText = currentSkin.name;
    document.getElementById('viewerModal').style.display = 'flex';

    if (modalViewer) {
        modalViewer.dispose();
        modalViewer = null;
    }

    // Tự động làm sạch nền đen ngay cả với các skin bạn đã upload trước đó
    processSkinImage(currentSkin.skinData, function(cleanBase64, detectedSlim) {
        isSlim = detectedSlim;
        document.getElementById('btnModel').classList.toggle('active', isSlim);
        document.getElementById('animRotate').classList.remove('active');
        document.getElementById('iconPause').style.display = 'block';
        document.getElementById('iconPlay').style.display = 'none';

        setTimeout(function() {
            const canvasEl = document.getElementById('modal_canvas');
            modalViewer = new skinview3d.SkinViewer({
                canvas: canvasEl,
                width: 300,
                height: 380,
                skin: cleanBase64,
                model: isSlim ? "slim" : "default"
            });
            
            modalViewer.camera.position.set(-22, 14, 34);
            modalViewer.camera.lookAt(0, 0, 0);
            setAnimation('walk');
        }, 50);
    });
}

function closeModal() {
    document.getElementById('viewerModal').style.display = 'none';
    if (modalViewer) {
        modalViewer.dispose();
        modalViewer = null;
    }
}

function closeModalOnOutside(e) {
    if (e.target.id === 'viewerModal') closeModal();
}

function setAnimation(type) {
    if (!modalViewer) return;
    document.querySelectorAll('.anim-bar button').forEach(function(b) {
        if (b.id !== 'animRotate') b.classList.remove('active');
    });

    if (type === 'walk') {
        modalViewer.animation = new skinview3d.WalkingAnimation();
        modalViewer.animation.speed = 0.6;
        document.getElementById('animWalk').classList.add('active');
    } else if (type === 'idle') {
        modalViewer.animation = new skinview3d.IdleAnimation();
        document.getElementById('animIdle').classList.add('active');
    }

    document.getElementById('iconPause').style.display = 'block';
    document.getElementById('iconPlay').style.display = 'none';
}

function togglePause() {
    if (!modalViewer || !modalViewer.animation) return;
    const isPaused = !modalViewer.animation.paused;
    modalViewer.animation.paused = isPaused;
    document.getElementById('iconPause').style.display = isPaused ? 'none' : 'block';
    document.getElementById('iconPlay').style.display = isPaused ? 'block' : 'none';
}

function toggleAutoRotate() {
    if (!modalViewer) return;
    modalViewer.autoRotate = !modalViewer.autoRotate;
    document.getElementById('animRotate').classList.toggle('active', modalViewer.autoRotate);
}

function toggleModelType() {
    if (!modalViewer) return;
    isSlim = !isSlim;
    modalViewer.playerObject.skin.modelType = isSlim ? "slim" : "default";
    document.getElementById('btnModel').classList.toggle('active', isSlim);
}

renderGallery();
