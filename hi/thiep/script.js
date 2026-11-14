// ==========================================
// 1. LOGIC ĐIỀU HƯỚNG CHUYỂN CẢNH & URL TÊN
// ==========================================
let receiverNameString = "Belikhun";

function getReceiverName() {
    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get('name');
    return name;
}

window.onload = function() {
    const name = getReceiverName();
    if (name) {
        const decodedName = decodeURIComponent(name);
        receiverNameString = decodedName;
        document.getElementById('receiver-name').innerText = decodedName;
        document.querySelector('.letter-name').innerText = decodedName;
    }
}

// Bấm mở dải ngân hà chữ bay từ hộp quà front-end
function toggleLetter(show) {
    if (show) {
        document.querySelector('.container-3d').classList.add('fade-out');
        document.querySelector('.overlay-content').classList.add('fade-out');
        
        const popup = document.getElementById('letter-popup');
        popup.classList.remove('letter-hidden');
        popup.classList.add('letter-visible');
        
        // Bật nhạc cất tiếng hát ngay khi bấm nút mở mật thư
        const music = document.getElementById('bg-music');
        if (music) {
            music.play().catch(err => console.log("Trình duyệt đợi tương tác: ", err));
        }
        
        setup3DGallery(); // Bật vũ trụ chữ bay 3D
        setupLanternLayer(); // Khởi chạy bộ động cơ quét Canvas lồng đèn chạy ngầm trước

        // Bộ hẹn giờ: Đếm ngược đúng 7 giây thì hiện chiếc nút ở góc màn hình
        setTimeout(() => {
            const specialBtn = document.getElementById('special-letter-btn');
            if (specialBtn) {
                specialBtn.style.display = 'block'; 
            }
        }, 7000); 
    }
}

function openLongLetter() {
    const finalPopup = document.getElementById('final-letter-popup');
    finalPopup.classList.remove('final-letter-hidden');
    finalPopup.classList.add('final-letter-visible');
}

function closeLongLetter() {
    const finalPopup = document.getElementById('final-letter-popup');
    finalPopup.classList.remove('final-letter-visible');
    finalPopup.classList.add('final-letter-hidden');
}

// ==========================================
// 2. ENGINE 3D: THÁC CHỮ SIÊU TO + BẦU TRỜI SAO LẤP LÁNH (PHÂN TẦNG LAYER)
// ==========================================
let items3D = [];
let stars3D = []; 
let imagesObjects = [];
let galleryInitialized = false;

// Biến lượng giác toàn cục điều khiển góc chuột / cảm ứng
let rotX = 0, rotY = 0;
let cosX = 1, sinX = 0;
let cosY = 1, sinY = 0;
let cameraZ = -300; 

function setup3DGallery() {
    if (galleryInitialized) return; 
    galleryInitialized = true;

    const canvas = document.getElementById('heart-canvas');
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    if(!document.querySelector('.gallery-hint')) {
        const hint = document.createElement('p');
        hint.className = 'gallery-hint';
        hint.innerText = '✨ Kéo chuột để xoay không gian, cuộn chuột để ZOOM lao thẳng vào đống chữ nha...';
        document.getElementById('letter-popup').appendChild(hint);
    }

    // Nạp ảnh chân dung thật từ GitHub của Thành Ngô
    const linksAnh = [
        'https://raw.githubusercontent.com/minhphu66778829-prog/model-3d/refs/heads/main/2025-12-18_13.17.08_4K.jpg',
        'https://raw.githubusercontent.com/minhphu66778829-prog/model-3d/refs/heads/main/2026-09-19_21.17.31_4K.jpg', 
        'https://raw.githubusercontent.com/minhphu66778829-prog/model-3d/refs/heads/main/image.jpg'   
    ];

    linksAnh.forEach((link, index) => {
        let img = new Image();
        img.crossOrigin = "anonymous"; 
        img.src = link;
        imagesObjects.push(img);
        
        items3D.push({
            type: 'image',
            imgObj: img,
            x: (Math.random() - 0.5) * 1600, 
            y: h / 2 + index * 400, 
            z: (index * 400) - 100,  
            w: 340, h: 180, 
            speedY: 4.5, 
            seed: Math.random() * 20
        });
    });

    // Tạo bầu trời sao lấp lánh nền 3D
    for (let i = 0; i < 350; i++) {
        stars3D.push({
            x: (Math.random() - 0.5) * 3500, 
            y: (Math.random() - 0.5) * 2500,
            z: (Math.random() * 2000) - 500, 
            size: Math.random() * 2 + 1,      
            twinkleSpeed: 0.02 + Math.random() * 0.05, 
            seed: Math.random() * 100
        });
    }

    // KHO DỮ LIỆU LỜI CHÚC TẾT TRUNG THU
    const mauGocChu = [
        `Dear, ${receiverNameString} 🌸`,
        "Happy Mid-Autumn Festival! 🥮🎑",
        "Chúc cậu một mùa Trung Thu ngập tràn ấm áp nhen!",
        "Trăng rằm tròn trịa, chúc cuộc sống của cậu luôn viên mãn... 🌕",
        "Chúc cậu luôn giữ được sự rạng rỡ và hồn nhiên như thỏ ngọc 🐰",
        "Có một đêm rằm phá cỗ thật vui vẻ bên gia đình và bạn bè nha! 🎉",
        "Đèn lồng thắp sáng, chúc mọi ước mơ của cậu đều thành hiện thực 🏮",
        "Mong cho cuộc sống của cậu luôn ngọt ngào như chiếc bánh nướng bánh dẻo 🥮",
        "Vui tươi - Bình an - Hạnh phúc - May mắn dạt dào 🎐",
        "Mãi luôn tỏa sáng rực rỡ như ánh trăng đêm rằm ⭐",
        "Trung Thu an lành! Trung Thu ấm áp! 🏮",
        "Bật mí nè: Cuộn chuột để tiến lại gần ngắm ảnh tớ nha 🔎",
        "Chúc cậu đón một Tết trông trăng thật trọn vẹn và đong đầy tình yêu 🥰",
        "Hôm nay cậu chính là người đón Trung Thu tuyệt vời nhất! 👑",
        "An nhiên tự tại, rước đèn phá cỗ giữa phố thị thênh thang 💫"
    ];

    const bangMauTrungThu = ['#ffffff', '#fffefe', '#ffccd5', '#ffd700', '#ff4d79', '#ffe6ee', '#ffffcc', '#ffa500'];

    for (let k = 0; k < 4; k++) {
        mauGocChu.forEach((text, index) => {
            items3D.push({
                type: 'text',
                text: text,
                x: (Math.random() - 0.5) * 2200, 
                y: h / 2 + (k * mauGocChu.length + index) * 130, 
                z: (Math.random() * 1100) - 300, 
                color: index === 0 ? '#ff4d79' : index === 1 ? '#ffd700' : bangMauTrungThu[Math.floor(Math.random() * bangMauTrungThu.length)],
                size: index === 0 ? 60 : index === 1 ? 48 : Math.floor(Math.random() * 6) + 26, 
                speedY: Math.random() * 2.5 + 4.5, 
                seed: Math.random() * 20
            });
        });
    }

    // --- BỘ ĐIỀU KHIỂN CHUỘT TRÊN MÁY TÍNH ---
    let isDragging = false, prevMouseX, prevMouseY;
    window.addEventListener('wheel', (e) => {
        cameraZ += e.deltaY * 0.8; 
        if(cameraZ > 1800) cameraZ = 1800; 
        if(cameraZ < -1500) cameraZ = -1500; 
    });

    canvas.addEventListener('mousedown', (e) => { isDragging = true; prevMouseX = e.clientX; prevMouseY = e.clientY; });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let deltaX = e.clientX - prevMouseX; let deltaY = e.clientY - prevMouseY;
        rotY += deltaX * 0.004; rotX += deltaY * 0.004;
        prevMouseX = e.clientX; prevMouseY = e.clientY;
    });
    window.addEventListener('mouseup', () => isDragging = false);

    // --- FIX CHÍ MẠNG: ĐỘNG CƠ CẢM ỨNG ĐA ĐIỂM TRÊN ĐIỆN THOẠI (XOAY + PINCH ZOOM) ---
    let startTouchDist = 0; // Khoảng cách ban đầu giữa 2 ngón tay khi bóp zoom

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Ép trình duyệt điện thoại không được cuộn trang web lung tung
        isDragging = true;
        if (e.touches.length === 1) {
            // Chế độ 1 ngón: Lưu tọa độ để chuẩn bị XOAY GÓC
            prevMouseX = e.touches[0].clientX; prevMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Chế độ 2 ngón: Tính khoảng cách để chuẩn bị ZOOM RA VÀO
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            startTouchDist = Math.sqrt(dx * dx + dy * dy);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDragging) return;

        if (e.touches.length === 1) {
            // XỬ LÝ XOAY 3D MƯỢT MÀ BẰNG 1 NGÓN TAY
            let deltaX = e.touches[0].clientX - prevMouseX;
            let deltaY = e.touches[0].clientY - prevMouseY;
            rotY += deltaX * 0.006; rotX += deltaY * 0.006;
            prevMouseX = e.touches[0].clientX; prevMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // XỬ LÝ BÓP/PHÓNG ZOOM 3D BẰNG 2 NGÓN TAY (Pinch-to-Zoom)
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            let currentDist = Math.sqrt(dx * dx + dy * dy);
            
            let deltaDist = currentDist - startTouchDist;
            cameraZ -= deltaDist * 2.2; // Lực phản hồi zoom thích ứng
            
            if(cameraZ > 1800) cameraZ = 1800; 
            if(cameraZ < -1500) cameraZ = -1500;
            startTouchDist = currentDist; // Cập nhật lại mốc khoảng cách liên tục
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => isDragging = false);

    window.addEventListener('resize', () => {
        w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight;
    });

    function project3D(x, y, z) {
        let x1 = x * cosY - z * sinY; let z1 = z * cosY + x * sinY;
        let y2 = y * cosX - z1 * sinX; let z2 = z1 * cosX + y * sinX;
        let relativeZ = z2 - cameraZ;
        const focus = 400; const scale = focus / (focus + relativeZ);
        return { x: x1 * scale + w / 2, y: y2 * scale + h / 2, scale: scale, zDepth: relativeZ };
    }

    function renderGallery() {
        ctx.fillStyle = '#05010a';
                ctx.fillRect(0, 0, w, h);

        // ĐÃ TÁCH DÒNG: Cập nhật ma trận lượng giác liên tục theo hoạt họa chuyển động chuột/vuốt
        cosX = Math.cos(rotX); 
        sinX = Math.sin(rotX);
        cosY = Math.cos(rotY); 
        sinY = Math.sin(rotY);

        // Vẽ sao nền 3D
        stars3D.forEach(star => {
            const proj = project3D(star.x, star.y, star.z);
            if (proj.scale <= 0 || proj.zDepth < -1200) return;
            let brightness = 0.3 + Math.abs(Math.sin(Date.now() * star.twinkleSpeed + star.seed)) * 0.7;
            ctx.save(); 
            ctx.globalAlpha = brightness; 
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, Math.max(0.5, star.size * proj.scale), 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff'; 
            ctx.shadowColor = '#ffffff'; 
            ctx.shadowBlur = 4 * proj.scale; 
            ctx.fill(); 
            ctx.restore();
        });

        // Vẽ chữ bay và ảnh 3D
        const renderedItems = items3D.map(item => {
            item.y -= item.speedY;
            if (item.y < -850) { 
                item.y = 650 + Math.random() * 300; 
                item.x = (Math.random() - 0.5) * 2200; 
            }
            const proj = project3D(item.x, item.y, item.z);
            return { item: item, projX: proj.x, projY: proj.y, scale: proj.scale, zDepth: proj.zDepth };
        });

        renderedItems.sort((a, b) => b.zDepth - a.zDepth);

        renderedItems.forEach(p => {
            if (p.scale <= 0 || p.zDepth < -1200) return;
            ctx.save(); 
            ctx.globalAlpha = 1.0;

            if (p.item.type === 'image') {
                let renderW = p.item.w * p.scale; 
                let renderH = p.item.h * p.scale;
                if (p.item.imgObj.complete && p.item.imgObj.naturalWidth > 0) {
                    ctx.shadowColor = "rgba(255, 179, 209, 0.4)"; 
                    ctx.shadowBlur = 15 * p.scale;
                    ctx.drawImage(p.item.imgObj, p.projX - renderW/2, p.projY - renderH/2, renderW, renderH);
                } else {
                    ctx.strokeStyle = "rgba(255, 179, 209, 0.8)"; 
                    ctx.lineWidth = 3 * p.scale; 
                    ctx.strokeRect(p.projX - renderW/2, p.projY - renderH/2, renderW, renderH);
                    ctx.font = `${30 * p.scale}px Arial`; 
                    ctx.fillStyle = "rgba(255, 179, 209, 0.8)"; 
                    ctx.textAlign = "center"; 
                    ctx.textBaseline = "middle"; 
                    ctx.fillText("🥮", p.projX, p.projY);
                }
            } else if (p.item.type === 'text') {
                ctx.font = `bold ${p.item.size * p.scale}px Arial`; 
                ctx.fillStyle = p.item.color; 
                ctx.textAlign = "center";
                ctx.shadowColor = p.item.color; 
                ctx.shadowBlur = 20 * p.scale; 
                ctx.fillText(p.item.text, p.projX, p.projY);
            }
            ctx.restore();
        });
    }

    // Đăng ký tham chiếu toàn cục cho bộ điều tốc
    renderGalleryFunctionRef = renderGallery;
}

// ==========================================
// 3. CANVAS LAYER 2 (TRÊN CÙNG): MƯA HẠT RƯỚC ĐÈN PHẲNG (ĐỒNG BỘ SIZE ĐIỆN THOẠI)
// ==========================================
let canvasL = null, ctxL = null;
let heartParticles = [];
let lanternLoopStarted = false;

function setupLanternLayer() {
    canvasL = document.getElementById('lantern-canvas');
    ctxL = canvasL.getContext('2d');
    let wL = canvasL.width = window.innerWidth;
    let hL = canvasL.height = window.innerHeight;

    window.addEventListener('resize', () => {
        wL = canvasL.width = window.innerWidth; 
        hL = canvasL.height = window.innerHeight;
    });

    function renderLanternLoop() {
        ctxL.clearRect(0, 0, wL, hL);
        for (let i = heartParticles.length - 1; i >= 0; i--) {
            let p = heartParticles[i];
            p.y -= p.speedY;
            p.x += Math.sin(p.y * 0.03) * p.wobble;
            p.alpha -= 0.005;
            
            ctxL.save();
            ctxL.globalAlpha = p.alpha;
            
            // Đã fix: Nếu màn hình dọc hẹp < 600px (Điện thoại) thì tự động thu bé icon rước đèn bằng 1/2 cho đỡ che chữ
            let responsiveSize = window.innerWidth < 600 ? p.size * 0.55 : p.size;
            ctxL.font = `${responsiveSize}px Arial`;
            ctxL.textAlign = "center";
            ctxL.textBaseline = "middle";
            ctxL.fillText(p.type, p.x, p.y);
            ctxL.restore();

            if (p.alpha <= 0 || p.y < -50) {
                heartParticles.splice(i, 1);
            }
        }
    }

    const originalRender = renderGalleryFunctionRef;
    renderGalleryFunctionRef = function() {
        if (originalRender) originalRender(); // Chạy sao chữ 3D trước
        renderLanternLoop(); // Ép lớp lồng đèn 2D chạy đè lên sau cùng
    };

    if (!lanternLoopStarted) {
        lanternLoopStarted = true;
        function animationLoop() {
            if (renderGalleryFunctionRef) renderGalleryFunctionRef();
            requestAnimationFrame(animationLoop);
        }
        animationLoop();
    }
}

function burstHearts() {
    const totalHearts = 45;
    for (let i = 0; i < totalHearts; i++) {
        heartParticles.push({
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 30,
            type: heartTypes[Math.floor(Math.random() * heartTypes.length)],
            size: Math.random() * 22 + 20,
            speedY: Math.random() * 2.5 + 3.5,
            wobble: Math.random() * 1.5,
            alpha: 1
        });
    }
}

