let redirectHistory = {};
let tabStatusCodes = {};
let requestStartTimes = {};
let requestTimers = {};
let contentScriptsReadyTabs = new Set();


chrome.webRequest.onErrorOccurred.addListener(
    function(details) {
        if (details.type === "main_frame") {
            console.log("Connection error detected:", details.error);
            const errorMessage = "Connection error detected: " + details.error; // Modify the message here
            createNotification(errorMessage, "Click to check for a fixed link using FABLE."); // Set the title and message
        }
    },
    { urls: ["<all_urls>"] }
);

function createNotification(message, title = "Notification Title") {
    if (typeof message !== 'string') {
        console.error('createNotification called with non-string message:', message);
        return; 
    }

    currentNotificationId = "notification-" + (new Date()).getTime();

    chrome.notifications.create(currentNotificationId, {
        type: "basic",
        iconUrl: "error.png", 
        title: title, 
        message: message, 
    });
}

chrome.notifications.onClicked.addListener(function(clickedId) {
    if (clickedId === currentNotificationId) {
        chrome.tabs.create({ url: "https://www.google.com" }); 
        chrome.notifications.clear(clickedId);
    }
});

chrome.webRequest.onHeadersReceived.addListener(
    function(details) {
        if (details.type === "main_frame") {
            tabStatusCodes[details.tabId] = details.statusCode;
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
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith("chrome://")) {
        console.log('Tab load complete:', tab.url);

        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Script injection failed:', chrome.runtime.lastError.message);
            } else {
                let statusCode = tabStatusCodes[tabId] || 0;

                if (!(statusCode >= 400 && statusCode < 600)) {
                    console.log('Error code is OK so initiating heuristic scoring for URL:', tab.url);
                    sendMessageWithRetry(tabId, { action: 'initiateScoring', url: tab.url });
                } else {
                    console.log('Displaying popup due to error status code:', statusCode);
                    chrome.tabs.sendMessage(tabId, { action: 'displayPopup' });                }

                delete tabStatusCodes[tabId];
            }
        });
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'displayPopupForTitle404' && sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'displayPopup' });
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if ((message.action === 'displayPopupForSparseContent' || message.action === 'displayPopupForTitle404') && sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'displayPopup' });
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'contentScriptReady' && sender.tab && sender.tab.id) {
        contentScriptsReadyTabs.add(sender.tab.id);
        console.log('Content script is ready in tab:', sender.tab.id);
    }
});

function sendMessageWithRetry(tabId, message, retries = 5, interval = 500) {
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

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'displayPopupBasedOnScore' && sender.tab) {
        if (message.score >= 8) { 
            console.log('Displaying popup based on scoring');
            chrome.tabs.sendMessage(sender.tab.id, { action: 'displayPopup' });
        } else {
            console.log('Heuristic score is low: page is valid');
        }
    }
});

let currentNotificationId = null;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'showBrowserPopup') {
        if (typeof message.message !== 'string') {
            console.error('Invalid message type for showBrowserPopup:', message.message);
            return;
        }

        if (currentNotificationId) {
            chrome.notifications.clear(currentNotificationId, () => {
                createNotification(message.message);
            });
        } else {
            createNotification(message.message);
        }
    }
});

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

function clearTimerAndCheckDuration(details) {
    let timerId = requestTimers[details.requestId];
    if (timerId) {
        clearTimeout(timerId);
        delete requestTimers[details.requestId];
    }
}

chrome.webRequest.onCompleted.addListener(clearTimerAndCheckDuration, { urls: ["<all_urls>"] });
chrome.webRequest.onErrorOccurred.addListener(clearTimerAndCheckDuration, { urls: ["<all_urls>"] });

async function checkHttpStatus(url, callback) {
    console.log(`Checking HTTP status for url: ${url}`);
    try {
        const response = await fetch(url, { method: 'HEAD' });
        callback(response.status);
    } catch (error) {
        console.error('HTTP Status Code Check Error:', error);
        callback(0);
    }
}
