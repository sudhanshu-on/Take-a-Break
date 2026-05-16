chrome.runtime.onMessage.addListener((message) => {

    if (message.action === "SHOW_WARNING") {

        showGraceWarning(message.warningSeconds || 15);
    }

    if (message.action === "SHOW_BREAK") {

        hideGraceWarning();
        showBreakOverlay(message.breakTime);
    }

    if (message.action === "HIDE_BREAK") {

        hideBreakOverlay();
        hideGraceWarning();
    }
});

let breakTimer = null;
let warningTimer = null;
let breakRenderFrame = null;
let breakVideo = null;
let breakCanvas = null;
let breakCanvasContext = null;
let _savedHtmlOverflow = null;
let _savedBodyOverflow = null;
let _wheelHandler = null;
let _touchHandler = null;
let _keydownHandler = null;

function pauseAllMedia() {

    let videos = document.querySelectorAll("video");

    videos.forEach((video) => {

        video.pause();
    });
}

function hideBreakOverlay() {

    if (breakTimer) {

        clearInterval(breakTimer);
        breakTimer = null;
    }

    if (breakRenderFrame) {

        cancelAnimationFrame(breakRenderFrame);
        breakRenderFrame = null;
    }

    if (breakVideo) {

        breakVideo.pause();
        breakVideo.src = "";
        breakVideo = null;
    }

    breakCanvas = null;
    breakCanvasContext = null;

    let overlay = document.getElementById("cat-break-overlay");

    if (overlay) {

        overlay.remove();
    }

    // restore page scrolling when overlay removed
    try {
        enablePageScroll();
    } catch (e) {}
}

function disablePageScroll() {
    try {
        _savedHtmlOverflow = document.documentElement.style.overflow;
        _savedBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        _wheelHandler = function (e) { e.preventDefault(); };
        _touchHandler = function (e) { e.preventDefault(); };
        _keydownHandler = function (e) {
            const blocked = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '];
            if (blocked.includes(e.key)) e.preventDefault();
        };

        window.addEventListener('wheel', _wheelHandler, { passive: false });
        window.addEventListener('touchmove', _touchHandler, { passive: false });
        window.addEventListener('keydown', _keydownHandler, { passive: false });
    } catch (e) {}
}

function enablePageScroll() {
    try {
        if (_wheelHandler) window.removeEventListener('wheel', _wheelHandler, { passive: false });
        if (_touchHandler) window.removeEventListener('touchmove', _touchHandler, { passive: false });
        if (_keydownHandler) window.removeEventListener('keydown', _keydownHandler, { passive: false });

        document.documentElement.style.overflow = _savedHtmlOverflow || '';
        document.body.style.overflow = _savedBodyOverflow || '';

        _wheelHandler = null;
        _touchHandler = null;
        _keydownHandler = null;
        _savedHtmlOverflow = null;
        _savedBodyOverflow = null;
    } catch (e) {}
}

function hideGraceWarning() {

    if (warningTimer) {

        clearInterval(warningTimer);
        warningTimer = null;
    }

    let warning = document.getElementById("break-warning-toast");

    if (warning) {

        warning.remove();
    }
}

function showGraceWarning(seconds) {

    hideGraceWarning();

    let warning = document.createElement("div");

    warning.id = "break-warning-toast";

    warning.innerHTML = `
        <div id="break-warning-box">
            Break coming in <span id="break-warning-timer">${seconds}</span> sec
        </div>
    `;

    document.body.appendChild(warning);

    // Use an absolute end timestamp so the timer stays accurate when tab is throttled
    const endTime = Date.now() + Math.max(0, seconds) * 1000;

    warningTimer = setInterval(() => {
        const remainingMs = endTime - Date.now();
        const remaining = Math.max(0, Math.ceil(remainingMs / 1000));

        let timerText = document.getElementById("break-warning-timer");

        if (timerText) timerText.innerText = remaining;

        if (remaining <= 0) {
            clearInterval(warningTimer);
            warningTimer = null;
            hideGraceWarning();
        }

    }, 200);
}

function showBreakOverlay(seconds) {
    pauseAllMedia();

    if (document.getElementById("cat-break-overlay")) return;

    const catVideoUrl = chrome.runtime.getURL("overlay_video/cat.mp4");

    let overlay = document.createElement("div");

    overlay.id = "cat-break-overlay";

    overlay.innerHTML = `
        <canvas id="cat-break-canvas"></canvas>
        <video id="cat-break-video" autoplay muted loop playsinline style="display:none"></video>
        <div id="cat-top-line">Take a break mate! i got you<3</div>
        <div id="cat-box">
            <h1>Brake tem !!</h1>
            <p id="break-timer">${seconds}</p>
        </div>
    `;

    document.body.appendChild(overlay);

    breakVideo = document.getElementById("cat-break-video");
    breakCanvas = document.getElementById("cat-break-canvas");

    if (breakCanvas) {

        breakCanvas.width = window.innerWidth;
        breakCanvas.height = window.innerHeight;
        breakCanvasContext = breakCanvas.getContext("2d", { willReadFrequently: true });
    }

    if (breakVideo) {

        breakVideo.src = catVideoUrl;
        breakVideo.addEventListener("loadedmetadata", renderBreakVideoFrame, { once: true });
        breakVideo.play().catch(() => {});
    }

    // disable page scrolling while overlay is active
    try { disablePageScroll(); } catch (e) {}

    window.addEventListener("resize", resizeBreakCanvas);

    requestAnimationFrame(renderBreakVideoFrame);

    let remaining = seconds;

    breakTimer = setInterval(() => {

        remaining--;

        let timerText = document.getElementById("break-timer");

        if (timerText) {

            timerText.innerText = remaining;
        }

        if (remaining <= 0) {
            clearInterval(breakTimer);
            breakTimer = null;

            // Ensure the overlay is removed immediately when the countdown ends
            try {
                hideBreakOverlay();
            } catch (e) {
                // swallow errors to avoid breaking the page
            }
        }

    }, 1000);
}

function resizeBreakCanvas() {

    if (!breakCanvas) return;

    breakCanvas.width = window.innerWidth;
    breakCanvas.height = window.innerHeight;
}

function renderBreakVideoFrame() {

    if (!breakVideo || !breakCanvas || !breakCanvasContext) return;

    const canvasWidth = breakCanvas.width;
    const canvasHeight = breakCanvas.height;
    const videoWidth = breakVideo.videoWidth || canvasWidth;
    const videoHeight = breakVideo.videoHeight || canvasHeight;

    const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight) * 0.88;
    const drawWidth = videoWidth * scale;
    const drawHeight = videoHeight * scale;
    const drawX = ((canvasWidth - drawWidth) / 2) + (canvasWidth * 0.03);
    const drawY = ((canvasHeight - drawHeight) / 2) + (canvasHeight * 0.04);

    breakCanvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    breakCanvasContext.drawImage(breakVideo, drawX, drawY, drawWidth, drawHeight);

    let frame = breakCanvasContext.getImageData(0, 0, canvasWidth, canvasHeight);
    let pixels = frame.data;

    for (let i = 0; i < pixels.length; i += 4) {

        let red = pixels[i];
        let green = pixels[i + 1];
        let blue = pixels[i + 2];

        let greenDominance = green - Math.max(red, blue);

        if (green > 80 && greenDominance > 20) {

            pixels[i + 3] = 0;
        }
    }

    breakCanvasContext.putImageData(frame, 0, 0);

    if (!breakVideo.paused && !breakVideo.ended) {

        breakRenderFrame = requestAnimationFrame(renderBreakVideoFrame);
    }
}

let style = document.createElement("style");

style.textContent = `

#cat-break-overlay {

    position: fixed;
    top: 0;
    left: 0;

    width: 100vw;
    height: 100vh;

    background: transparent;

    z-index: 999999;

    display: block;

    color: white;
    font-family: Arial;
    overflow: hidden;
}

#cat-break-video {

    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
    background: transparent;
}

#cat-top-line {

    position: fixed;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    padding: 10px 16px;
    border-radius: 999px;
    background: rgba(18, 14, 10, 0.48);
    backdrop-filter: blur(8px) saturate(120%);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #fff3c4;
    font-family: Arial;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.2px;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
    text-align: center;
    white-space: nowrap;
}

#cat-break-canvas {

    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    background: transparent;
}

#break-warning-toast {

    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 999998;
    pointer-events: none;
}

#break-warning-box {

    background: rgba(20, 20, 20, 0.88);
    color: white;
    padding: 10px 14px;
    border-radius: 10px;
    font-family: Arial;
    font-size: 14px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    letter-spacing: 0.2px;
}

#cat-box {

    text-align: center;
    position: fixed;
    top: 18px;
    left: 18px;
    z-index: 2;
    padding: 16px 18px 18px;
    min-width: 220px;
    border-radius: 16px;
    background: rgba(18, 14, 10, 0.45);
    backdrop-filter: blur(6px) saturate(120%);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.12);
}

#cat-box h1 {

    margin: 0 0 10px 0;
    font-size: 20px;
    font-weight: 700;
}

#break-timer {

    margin: 0;
    font-size: 64px;
    font-weight: 800;
    line-height: 1;
    color: #fff3c4;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
`;

document.head.appendChild(style);