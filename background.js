let redirectHistory = {};
let tabStatusCodes = {};
let requestStartTimes = {};
let requestTimers = {};
let contentScriptsReadyTabs = new Set();

const goodHttpCodes = [
    100, 101, 102, 103,
    200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
    250, 300, 301, 302, 303, 304, 305, 306, 307, 308,
];

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        chrome.runtime.sendMessage({ action: 'getAllMappings' });
    }
  });

chrome.webRequest.onErrorOccurred.addListener(
    function(details) {
        if (details.type === "main_frame") {
            console.log("Connection error detected:", details.error);
            const errorMessage = "Connection error detected: " + details.error;
            createNotification(errorMessage, "Click to check for a fixed link using FABLE.");
        }
    },
    { urls: ["<all_urls>"] }
);

function createNotification(message, title = "Notification Title") {
    if (typeof message !== 'string') {
        console.error('createNotification called with non-string message:', message);
        return; 
    }

    chrome.action.setBadgeBackgroundColor({ color: [200, 0, 0, 255] }, function() {
        console.log('Badge background color set to dark red');
    });
    

    chrome.action.setBadgeText({ text: 'FIX' }, function() {
        console.log('Badge text set to "NEW"');
    });
}

chrome.webRequest.onHeadersReceived.addListener(
    function(details) {
        if (details.type === "main_frame") {
            console.log(`[Headers Received] Main frame status code for tab ${details.tabId}:`, details.statusCode);
            tabStatusCodes[details.tabId] = details.statusCode;
        } else {
            console.log(`[Headers Received] Ignoring non-main frame type for tab ${details.tabId}:`, details.type);
        }
    },
    { urls: ["<all_urls>"], types: ["main_frame"] },
    ["responseHeaders"]
);

chrome.webRequest.onBeforeRedirect.addListener(
    function(details) {
        if (!redirectHistory[details.tabId]) {
            redirectHistory[details.tabId] = [];
        }

        redirectHistory[details.tabId].push({ 
            from: details.initiator, 
            to: details.redirectUrl, 
            timestamp: Date.now()
        });
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

chrome.tabs.onRemoved.addListener(function(tabId) {
    delete redirectHistory[tabId];
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    console.log(`[Tab Updated] Tab update for ${tabId}, Status: ${changeInfo.status}, URL: ${tab.url}`);
    
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith("chrome://")) {
        if (tabStatusCodes.hasOwnProperty(tabId)) {

        let statusCode = tabStatusCodes[tabId];
        console.log(`[Tab Updated] Status code for main frame in tab ${tabId}:`, statusCode);


        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Script injection failed:', chrome.runtime.lastError.message);
            } else {
                if (!goodHttpCodes.includes(statusCode)) {
                    console.error('Bad status code detected:', statusCode);
                    chrome.tabs.sendMessage(tabId, { action: 'displayPopup', URL: tab.url});
                } else {
                                                        chrome.action.setBadgeText({ text: '' }, function() {
                                                            console.log('Badge cleared');
                                        });
                    console.log('Good status code, checking for soft 404:', statusCode);
                    sendMessageWithRetry(tabId, { action: 'initiateScoring', url: tab.url });
                }

                delete tabStatusCodes[tabId];
            }
        });
    } else {
        console.log(`[Tab Updated] Ignoring incomplete load or chrome URL for tab ${tabId}`);
    }
}
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'contentScriptReady' && sender.tab && sender.tab.id) {
        contentScriptsReadyTabs.add(sender.tab.id);
        console.log('Content script is ready in tab:', sender.tab.id);
    }
});

function sendMessageWithRetry(tabId, message, retries = 5, interval = 500) {
    console.log(`[Send Message] Attempting to send message to tab ${tabId}, Retries left: ${retries}`);

    if (retries === 0) {
        console.log('Max retries reached for tab:', tabId);
        return;
    }

    if (contentScriptsReadyTabs.has(tabId)) {
        console.log('Sending message to tab:', tabId);
        chrome.tabs.sendMessage(tabId, message, response => {
            if (chrome.runtime.lastError) {
                console.log('Error or no response from content script:', chrome.runtime.lastError.message);
                setTimeout(() => sendMessageWithRetry(tabId, message, retries - 1, interval), interval);
            } else {
                console.log('Message sent successfully to tab:', tabId);
            }
        });
    } else {
        console.log(`Content script not ready in tab ${tabId}, retrying... (${retries} retries left)`);
        setTimeout(() => sendMessageWithRetry(tabId, message, retries - 1, interval), interval);
    }
}

let currentNotificationId = null;

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        if (details.type === "main_frame") {
            const TIMEOUT_THRESHOLD = 8000;
            requestTimers[details.requestId] = setTimeout(() => {
                chrome.tabs.get(details.tabId, tab => {
                    if (!tab || tab.status !== 'complete') {
                        createNotification("The page is taking too long to load.", "Click to check for a fixed link using FABLE.");
                    }
                });
            }, TIMEOUT_THRESHOLD);
        }
    },
    { urls: ["<all_urls>"], types: ["main_frame"] }
);



