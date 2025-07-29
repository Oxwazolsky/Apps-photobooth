document.addEventListener('DOMContentLoaded', () => {
    const startScreen = document.getElementById('start-screen');
    const photoboothMainUI = document.getElementById('photobooth-main-ui');
    const formatOptions = document.querySelectorAll('.format-option');
    const startPhotoboothBtn = document.getElementById('start-photobooth-btn');
    
    const webcam = document.getElementById('webcam');
    const cameraError = document.getElementById('camera-error');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownTimer = document.getElementById('countdown-timer');
    
    const captureControls = document.getElementById('capture-controls');
    const editControls = document.getElementById('edit-controls');
    const photoCounter = document.getElementById('photo-counter');
    
    const livePreviewContainer = document.getElementById('live-preview-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const livePreviewCanvas = document.getElementById('live-preview-canvas');
    
    const backgroundEditor = document.getElementById('background-editor');
    const backgroundOptions = document.getElementById('background-options');
    const stickerOptions = document.getElementById('sticker-options');
    const filterSelect = document.getElementById('filter-select');
    
    const finalActions = document.getElementById('final-actions');
    const downloadBtn = document.getElementById('download-btn');
    const restartBtn = document.getElementById('restart-btn');

    let selectedFormat = null;
    let photoLimit = 4;
    let capturedPhotos = [];
    let stream = null;
    let stickersOnCanvas = [];
    let selectedStickerIndex = -1;
    let isDragging = false;
    let dragOffsetX, dragOffsetY;
    let selectedFilter = 'none';

    const backgroundColors = ['#FFFFFF', '#27272a', '#a25cdfff', '#9f1239', '#556B2F'];
    let selectedBgColor = '#FFFFFF';

    const stickers = [
        'images/stickers/aduhai1.jpeg', 
        'images/stickers/aduhai2.jpeg',
        'images/stickers/aduhai3.jpeg',
        'images/stickers/aduhai4.jpeg',
        'images/stickers/aduhai5.jpeg',
        'images/stickers/aduhai6.jpeg',
        'images/stickers/aduhai7.jpeg',
        'images/stickers/aduhai8.jpeg',
        'images/stickers/aduhai9.jpeg',
        'images/stickers/aduhai10.jpeg',
        'images/stickers/aduhai11.jpeg',
        'images/stickers/aduhai12.jpeg',
    ];
    
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function init() {
        setupBackground();

        backgroundOptions.innerHTML = '';
        backgroundColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch w-8 h-8 rounded-full cursor-pointer border-2 border-gray-300 transition-all hover:opacity-80';
            swatch.style.backgroundColor = color;
            if (color === '#FFFFFF' || color === '#27272a') {
                swatch.classList.add('border-gray-400');
            }
            swatch.addEventListener('click', () => {
                selectedBgColor = color;
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected-color'));
                swatch.classList.add('selected-color');
                drawLivePreviewCanvas();
            });
            backgroundOptions.appendChild(swatch);
        });
        if (backgroundOptions.firstChild) {
            backgroundOptions.firstChild.classList.add('selected-color');
        }


        stickers.forEach(stickerSrc => {
            const img = new Image();
            img.src = stickerSrc;
            // img.crossOrigin = "Anonymous"; // Dihapus karena gambar sekarang dari sumber lokal
            img.className = 'w-full p-1 bg-gray-200 rounded-md cursor-pointer border-2 border-transparent transition-all hover:bg-gray-300';
            img.addEventListener('click', () => addSticker(img));
            stickerOptions.appendChild(img);
        });
        
        formatOptions.forEach(option => option.addEventListener('click', selectFormat));
        startPhotoboothBtn.addEventListener('click', startPhotobooth);
        restartBtn.addEventListener('click', resetApp);
        filterSelect.addEventListener('change', (e) => {
            selectedFilter = e.target.value;
            drawLivePreviewCanvas();
        });
        
        livePreviewCanvas.addEventListener('mousedown', handleCanvasMouseDown);
        livePreviewCanvas.addEventListener('mousemove', handleCanvasMouseMove);
        livePreviewCanvas.addEventListener('mouseup', handleCanvasMouseUp);
        livePreviewCanvas.addEventListener('mouseleave', handleCanvasMouseUp);
    }
    
    const bgCanvas = document.getElementById('animated-bg');
    const bgCtx = bgCanvas.getContext('2d');
    let particles = [];
    let animationFrameId;

    function setupBackground() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;

        const particleCount = Math.floor((bgCanvas.width * bgCanvas.height) / 20000);
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * bgCanvas.width,
                y: Math.random() * bgCanvas.height,
                radius: Math.random() * 1.5 + 0.5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
            });
        }

        if (!animationFrameId) {
            animateBackground();
        }
    }

    function animateBackground() {
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > bgCanvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > bgCanvas.height) p.vy *= -1;

            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            bgCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            bgCtx.fill();
        });

        bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        bgCtx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i; j < particles.length; j++) {
                const dist = Math.sqrt(
                    Math.pow(particles[i].x - particles[j].x, 2) +
                    Math.pow(particles[i].y - particles[j].y, 2)
                );

                if (dist < 150) {
                    bgCtx.beginPath();
                    bgCtx.moveTo(particles[i].x, particles[i].y);
                    bgCtx.lineTo(particles[j].x, particles[j].y);
                    bgCtx.stroke();
                }
            }
        }

        animationFrameId = requestAnimationFrame(animateBackground);
    }

    window.addEventListener('resize', () => {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        setupBackground();
    });

    function selectFormat(event) {
        formatOptions.forEach(opt => opt.classList.remove('selected-format'));
        const selectedOption = event.currentTarget;
        selectedOption.classList.add('selected-format');
        selectedFormat = selectedOption.dataset.format;

        photoLimit = (selectedFormat === 'double-strip') ? 6 : 4;
        photoCounter.textContent = `Pilih format untuk memulai`;
        startPhotoboothBtn.disabled = false;
    }

    async function startPhotobooth() {
        if (!selectedFormat) return;
        
        startPhotoboothBtn.disabled = true;
        startPhotoboothBtn.textContent = "Memuat Kamera...";

        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
            webcam.srcObject = stream;
            await new Promise(resolve => webcam.onloadedmetadata = resolve);
            
            startScreen.classList.add('hidden');
            photoboothMainUI.classList.remove('hidden');
            
            await runCaptureSequence();

        } catch (err) {
            console.error("Gagal akses kamera:", err);
            cameraError.classList.remove('hidden');
            resetApp();
        }
    }

    async function runCaptureSequence() {
        captureControls.classList.remove('hidden');

        for (let i = 1; i <= photoLimit; i++) {
            photoCounter.textContent = `Bersiap untuk foto ${i} dari ${photoLimit}...`;
            await sleep(2000);

            countdownOverlay.classList.remove('hidden');
            countdownOverlay.classList.add('flex');
            for (let j = 3; j > 0; j--) {
                countdownTimer.textContent = j;
                await sleep(1000);
            }
            
            countdownTimer.textContent = '📸';
            await sleep(300);
            
            await captureSinglePhoto();
            
            countdownOverlay.classList.add('hidden');
            countdownOverlay.classList.remove('flex');
        }
        updateUIState();
    }

    function captureSinglePhoto() {
        return new Promise(resolve => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = webcam.videoWidth;
            tempCanvas.height = webcam.videoHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.save();
            tempCtx.scale(-1, 1);
            tempCtx.drawImage(webcam, -tempCanvas.width, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.restore();
            
            const img = new Image();
            img.src = tempCanvas.toDataURL('image/png');
            img.onload = () => {
                capturedPhotos.push(img);
                if (capturedPhotos.length === 1) {
                    livePreviewContainer.classList.remove('hidden');
                }
                drawLivePreviewCanvas();
                resolve();
            };
        });
    }

    function updateUIState() {
        if (capturedPhotos.length >= photoLimit) {
            captureControls.classList.add('hidden');
            editControls.classList.remove('hidden');
            finalActions.classList.remove('hidden');
            stopWebcam();

            backgroundEditor.style.display = 'block';
        }
    }

    function cropAndDrawImage(ctx, img, dx, dy, dWidth, dHeight) {
        const imgAspectRatio = img.width / img.height;
        const canvasAspectRatio = dWidth / dHeight;
        let sx, sy, sWidth, sHeight;

        if (imgAspectRatio > canvasAspectRatio) {
            sHeight = img.height;
            sWidth = sHeight * canvasAspectRatio;
            sx = (img.width - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = img.width;
            sHeight = sWidth / canvasAspectRatio;
            sx = 0;
            sy = (img.height - sHeight) / 2;
        }
        ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }

    function drawLivePreviewCanvas() {
        if (!selectedFormat || capturedPhotos.length === 0) return;
        const ctx = livePreviewCanvas.getContext('2d');
        
        const filters = {
            'none': 'none',
            'bw': 'grayscale(100%)',
            'sepia': 'sepia(100%)',
            'vintage': 'sepia(60%) contrast(1.1) brightness(0.9) saturate(0.9)',
            'retro': 'sepia(0.5) contrast(1.2) brightness(0.9) saturate(1.2) hue-rotate(-15deg)',
            'beach': 'saturate(1.4) contrast(1.05) brightness(1.05)',
        };
        
        canvasWrapper.classList.remove('max-w-xs', 'max-w-sm');
        if (selectedFormat === 'strip') {
            canvasWrapper.classList.add('max-w-xs');
            drawStripLayout(ctx, filters[selectedFilter]);
        } else if (selectedFormat === 'double-strip') {
            canvasWrapper.classList.add('max-w-sm');
            drawDoubleStripLayout(ctx, filters[selectedFilter]);
        }
        
        stickersOnCanvas.forEach(sticker => ctx.drawImage(sticker.img, sticker.x, sticker.y, sticker.width, sticker.height));
        
        downloadBtn.href = livePreviewCanvas.toDataURL('image/png');
    }

    function drawStripLayout(ctx, filter) {
        const DPI = 300;
        const canvasWidth = 2 * DPI;
        const canvasHeight = 6 * DPI;

        livePreviewCanvas.width = canvasWidth;
        livePreviewCanvas.height = canvasHeight;

        const PADDING = 30;
        const PHOTO_SPACING = 30;
        const HEADER_H = 120;
        const FOOTER_H = 120;
        
        const photoWidth = canvasWidth - (PADDING * 2);
        const availableHeight = canvasHeight - HEADER_H - FOOTER_H - (PHOTO_SPACING * (photoLimit - 1));
        const photoHeight = availableHeight / photoLimit;

        ctx.save();
        ctx.filter = filter;
        ctx.fillStyle = selectedBgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const isLightBg = ['#FFFFFF', '#a1a1aa'].includes(selectedBgColor);
        ctx.fillStyle = isLightBg ? '#1f2937' : '#FFFFFF';
        ctx.font = "bold 48px 'Caveat', cursive";
        ctx.textAlign = 'center';
        ctx.fillText('Putra Photo Booth', canvasWidth / 2, HEADER_H / 2 + 15);

        for (let i = 0; i < capturedPhotos.length; i++) {
            const yPos = HEADER_H + (i * (photoHeight + PHOTO_SPACING));
            cropAndDrawImage(ctx, capturedPhotos[i], PADDING, yPos, photoWidth, photoHeight);
        }

        ctx.fillStyle = isLightBg ? '#4b5563' : '#FFFFFF';
        ctx.font = "28px 'Inter', sans-serif";
        const today = new Date();
        const dateString = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        ctx.fillText(dateString + ' ♡', canvasWidth / 2, canvasHeight - (FOOTER_H / 2));
        ctx.restore();
    }

    function drawDoubleStripLayout(ctx, filter) {
        const DPI = 300;
        const canvasWidth = 4 * DPI;
        const canvasHeight = 6 * DPI;

        livePreviewCanvas.width = canvasWidth;
        livePreviewCanvas.height = canvasHeight;

        const PADDING = 60;
        const COL_SPACING = 40;
        const ROW_SPACING = 40;
        const FOOTER_H = 180;

        ctx.save();
        ctx.filter = filter;
        ctx.fillStyle = selectedBgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        const contentWidth = canvasWidth - (PADDING * 2);
        const contentHeight = canvasHeight - PADDING - FOOTER_H;

        const photoWidth = (contentWidth - COL_SPACING) / 2;
        const photoHeight = (contentHeight - (ROW_SPACING * 2)) / 3;

        for (let i = 0; i < capturedPhotos.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            
            const xPos = PADDING + col * (photoWidth + COL_SPACING);
            const yPos = PADDING + row * (photoHeight + ROW_SPACING);
            
            cropAndDrawImage(ctx, capturedPhotos[i], xPos, yPos, photoWidth, photoHeight);
        }
        
        const footerY = canvasHeight - FOOTER_H;
        const isLightBg = ['#FFFFFF', '#a1a1aa'].includes(selectedBgColor);
        ctx.fillStyle = isLightBg ? '#1f2937' : '#FFFFFF';
        ctx.font = `bold ${FOOTER_H * 0.4}px 'Caveat', cursive`;
        ctx.textAlign = 'center';
        ctx.fillText('Putra Photo Booth', canvasWidth / 2, footerY + (FOOTER_H * 0.5));
        
        ctx.fillStyle = isLightBg ? '#6b7280' : '#FFFFFF';
        ctx.font = `${FOOTER_H * 0.2}px 'Inter', sans-serif`;
        const today = new Date();
        const dateString = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        ctx.fillText(dateString + ' ♡', canvasWidth / 2, footerY + (FOOTER_H * 0.8));
        ctx.restore();
    }

    function addSticker(stickerImgElement) {
        const stickerSize = 150; 
        const sticker = { 
            img: stickerImgElement, 
            x: (livePreviewCanvas.width / 2) - (stickerSize / 2), 
            y: (livePreviewCanvas.height / 2) - (stickerSize / 2), 
            width: stickerSize, 
            height: stickerSize 
        };
        stickersOnCanvas.push(sticker);
        drawLivePreviewCanvas();
    }

    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return { 
            x: (evt.clientX - rect.left) * (canvas.width / rect.width), 
            y: (evt.clientY - rect.top) * (canvas.height / rect.height) 
        };
    }

    function handleCanvasMouseDown(e) {
        e.preventDefault();
        const pos = getMousePos(livePreviewCanvas, e);
        for (let i = stickersOnCanvas.length - 1; i >= 0; i--) {
            const s = stickersOnCanvas[i];
            if (pos.x >= s.x && pos.x <= s.x + s.width && pos.y >= s.y && pos.y <= s.y + s.height) {
                selectedStickerIndex = i; isDragging = true; dragOffsetX = pos.x - s.x; dragOffsetY = pos.y - s.y; return;
            }
        }
    }

    function handleCanvasMouseMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const pos = getMousePos(livePreviewCanvas, e);
        stickersOnCanvas[selectedStickerIndex].x = pos.x - dragOffsetX;
        stickersOnCanvas[selectedStickerIndex].y = pos.y - dragOffsetY;
        drawLivePreviewCanvas();
    }
    
    function handleCanvasMouseUp() { isDragging = false; selectedStickerIndex = -1; }
    
    function stopWebcam() {
        if (stream) stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    function resetApp() {
        stopWebcam();
        selectedFormat = null; 
        capturedPhotos = []; 
        stickersOnCanvas = []; 
        selectedBgColor = '#FFFFFF';
        photoLimit = 4;
        selectedFilter = 'none';
        filterSelect.value = 'none';
        
        startPhotoboothBtn.disabled = true;
        startPhotoboothBtn.textContent = "Mulai Sesi";
        formatOptions.forEach(opt => opt.classList.remove('selected-format'));
        
        photoboothMainUI.classList.add('hidden');
        startScreen.classList.remove('hidden');
        livePreviewContainer.classList.add('hidden');
        
        captureControls.classList.remove('hidden');
        editControls.classList.add('hidden');
        finalActions.classList.add('hidden');
        backgroundEditor.style.display = 'block';
        
        photoCounter.textContent = `Pilih format untuk memulai`;
        
        const ctx = livePreviewCanvas.getContext('2d');
        ctx.clearRect(0, 0, livePreviewCanvas.width, livePreviewCanvas.height);
    }
    
    init();
});
