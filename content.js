chrome.runtime.onMessage.addListener((message) => {

    if (message.action === "SHOW_BREAK") {

        showBreakOverlay(message.breakTime);
    }

    if (message.action === "HIDE_BREAK") {

        hideBreakOverlay();
    }
});

let breakTimer = null;

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

    let overlay = document.getElementById("cat-break-overlay");

    if (overlay) {

        overlay.remove();
    }
}

function showBreakOverlay(seconds) {
    pauseAllMedia();

    if (document.getElementById("cat-break-overlay")) return;

    let overlay = document.createElement("div");

    overlay.id = "cat-break-overlay";

    overlay.innerHTML = `
        <div id="cat-box">
            <h1>Take a Break 😺</h1>
            <p id="break-timer">${seconds}</p>
        </div>
    `;

    document.body.appendChild(overlay);

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
        }

    }, 1000);
}

let style = document.createElement("style");

style.textContent = `

#cat-break-overlay {

    position: fixed;
    top: 0;
    left: 0;

    width: 100vw;
    height: 100vh;

    background: rgba(0,0,0,0.9);

    z-index: 999999;

    display: flex;
    justify-content: center;
    align-items: center;

    color: white;
    font-family: Arial;
}

#cat-box {

    text-align: center;
}
`;

document.head.appendChild(style);