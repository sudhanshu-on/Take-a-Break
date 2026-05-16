let currentWebsite = null;

let websiteTimes = {};

let isOnBreak = false;

let warningShown = {};

// let websiteLimits = {
//     "instagram.com": 10,
//     "youtube.com": 10,
//     "chatgpt.com": 45
// };

// let defaultBreak = 5;

const graceWarningSeconds = 15;

function getGraceWarningDuration(limit) {

    return Math.min(graceWarningSeconds, limit);
}

// load saved settings
chrome.storage && chrome.storage.sync && chrome.storage.sync.get({ websiteLimits: {}, defaultBreak: {} }, (items) => {
    if (items.websiteLimits) websiteLimits = items.websiteLimits;
    if (items.defaultBreak) defaultBreak = items.defaultBreak;
});

// watch for changes
chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.websiteLimits) websiteLimits = changes.websiteLimits.newValue;
    if (changes.defaultBreak) defaultBreak = changes.defaultBreak.newValue;
});

async function updateActiveWebsite(tabId) {

    try {

        let tab = await chrome.tabs.get(tabId);

        if (!tab.url) return;

        let url = new URL(tab.url);

        currentWebsite = url.hostname.replace("www.", "");

        console.log("Active website:", currentWebsite);

    } catch (error) {

        console.log("Error:", error);
    }
}

function canReceiveContentScript(tab) {

    if (!tab || !tab.url) return false;

    try {

        let url = new URL(tab.url);

        return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:";

    } catch (error) {

        return false;
    }
}

async function sendBreakMessage(tab, message) {

    if (!canReceiveContentScript(tab)) return;

    try {

        await chrome.tabs.sendMessage(tab.id, message);
        return;

    } catch (error) {

        console.log("Could not send break message, will try injecting content script:", error);
    }

    // Try to inject the content script at runtime then resend the message
    try {

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });

        // Retry sending the message after injection
        await chrome.tabs.sendMessage(tab.id, message);

    } catch (err) {

        console.log("Could not send break message after injection:", err);
    }
}

chrome.tabs.onActivated.addListener((activeInfo) => {

    updateActiveWebsite(activeInfo.tabId);
});

function checkBreakRules() {

    if (isOnBreak) return;

    let limit = websiteLimits[currentWebsite];

    if (!limit) return;

    let timeSpent = websiteTimes[currentWebsite];

    let currentGraceWarningSeconds = getGraceWarningDuration(limit);
    let warningThreshold = Math.max(0, limit - currentGraceWarningSeconds);

    if (timeSpent >= warningThreshold && timeSpent < limit && !warningShown[currentWebsite]) {

        warningShown[currentWebsite] = true;

        sendBreakMessageToActiveTab({
            action: "SHOW_WARNING",
            warningSeconds: currentGraceWarningSeconds
        });
    }

    if (timeSpent >= limit) {

        console.log("BREAK TIME FOR:", currentWebsite);

        triggerBreak();

        websiteTimes[currentWebsite] = 0;
        warningShown[currentWebsite] = false;
    }
}

async function sendBreakMessageToActiveTab(message) {

    let tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (tabs.length === 0) return;

    await sendBreakMessage(tabs[0], message);
}

setInterval(() => {

    if (!currentWebsite) return;

    if (!websiteTimes[currentWebsite]) {

        websiteTimes[currentWebsite] = 0;
    }

    checkBreakRules();

    websiteTimes[currentWebsite]++;

    console.log(websiteTimes);

    checkBreakRules();

}, 1000);

function startBreakTimer(seconds) {

    let remaining = seconds;

    let breakInterval = setInterval(() => {

        remaining--;

        console.log("Break:", remaining);

        if (remaining <= 0) {

            clearInterval(breakInterval);

            endBreak();
        }

    }, 1000);
}

async function endBreak() {

    isOnBreak = false;

    warningShown[currentWebsite] = false;

    let tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (tabs.length === 0) return;

    await sendBreakMessage(tabs[0], {
        action: "HIDE_BREAK"
    });

    websiteTimes[currentWebsite] = 0;

    console.log("Break ended");
}

async function triggerBreak() {

    isOnBreak = true;

    let tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (tabs.length === 0) return;

    await sendBreakMessage(tabs[0], {
        action: "SHOW_BREAK",
        breakTime: defaultBreak
    });

    startBreakTimer(defaultBreak);
}