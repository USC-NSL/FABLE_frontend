// background.js
// console.log('Background script loaded');
let redirectHistory = {};
let tabStatusCodes = {};
let requestStartTimes = {};
let requestTimers = {};



chrome.webRequest.onErrorOccurred.addListener(
    function(details) {
        if (details.type === "main_frame") {
            console.log("Connection error detected:", details.error);
            // Call to show browser popup directly
            createNotification("Click to check for a fixed link using FABLE");        
        }
    },
    { urls: ["<all_urls>"] }
);

// Function to create a browser notification
function createNotification(message) {
    if (typeof message !== 'string') {
        console.error('createNotification called with non-string message:', message);
        return; // Exit the function if message is not a string
    }

    currentNotificationId = "notification-" + (new Date()).getTime(); // Unique ID for the notification

    chrome.notifications.create(currentNotificationId, {
        type: "basic",
        iconUrl: "error.png",  // Path to the icon
        title: "Notification Title",
        message: message,  // Ensure this is a string
    });
}


// Listener for notification click event
chrome.notifications.onClicked.addListener(function(clickedId) {
    if (clickedId === currentNotificationId) {
        chrome.tabs.create({ url: "https://www.google.com" }); // Opens a new tab with the specified URL
        chrome.notifications.clear(clickedId); // Clear the notification after it's clicked
    }
});

function showNotification(message) {
    currentNotificationId = "notification-" + (new Date()).getTime(); // Unique ID for the notification

    chrome.notifications.create(currentNotificationId, {
        type: "basic",
        iconUrl: "error.png",  // Path to the icon
        title: "asdkjnasdkjnasdjknasdkjne",
        message: message,
        // requireInteraction: true  // Notification stays until user interaction
    });

}


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
    { urls: ["<all_urls>"] }, // You can narrow this down if needed
    ["responseHeaders"]
);


// background.js
let contentScriptsReadyTabs = new Set();

chrome.tabs.onRemoved.addListener(function(tabId) {
    delete redirectHistory[tabId];
});


// Listener for web requests starting
// chrome.webRequest.onBeforeRequest.addListener(
//     function(details) {
//         // console.log('Web request started for:', details.url, 'Type:', details.type, 'FrameID:', details.frameId);
//         // Additional logic can be added here if needed
//     },
//     { urls: ["<all_urls>"] }
// );

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

                // Check if the HTTP status is not in the 400-599 range
                if (!(statusCode >= 400 && statusCode < 600)) {
                    console.log('Error code is OK so initiating heuristic scoring for URL:', tab.url);
                    sendMessageWithRetry(tabId, { action: 'initiateScoring', url: tab.url });
                } else {
                    console.log('Displaying popup due to error status code:', statusCode);
                    chrome.tabs.sendMessage(tabId, { action: 'displayPopup' });                }

                // Clear the stored status code for this tab
                delete tabStatusCodes[tabId];
            }
        });
    }
});

// Listener in background.js to receive messages from content.js
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'displayPopupForTitle404' && sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'displayPopup' });
    }
});

// Listener for messages from content.js
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

// Function to send a message with retry logic
// Function to send a message with retry logic
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
                // Handle response if necessary
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
        if (message.score >= 8) {  // Threshold for showing popup
            console.log('Displaying popup based on scoring');
            chrome.tabs.sendMessage(sender.tab.id, { action: 'displayPopup' });
        } else {
            console.log('Heuristic score is low: page is valid');
        }
    }
});

// Global variable to keep track of the current notification ID
let currentNotificationId = null;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'showBrowserPopup') {
        if (typeof message.message !== 'string') {
            console.error('Invalid message type for showBrowserPopup:', message.message);
            return; // Exit if message is not a string
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
            // Start a timer when a main frame request starts
            const TIMEOUT_THRESHOLD = 8000; // e.g., 5 seconds
            requestTimers[details.requestId] = setTimeout(() => {
                chrome.tabs.get(details.tabId, tab => {
                    if (!tab || tab.status !== 'complete') {
                        createNotification("The page is taking too long to load.");
                    }
                });
            }, TIMEOUT_THRESHOLD);
        }
    },
    { urls: ["<all_urls>"], types: ["main_frame"] }
);

// Listener for request completion or errors
function clearTimerAndCheckDuration(details) {
    let timerId = requestTimers[details.requestId];
    if (timerId) {
        clearTimeout(timerId); // Clear the timer
        delete requestTimers[details.requestId]; // Remove the timer from the tracking object
    }
}

chrome.webRequest.onCompleted.addListener(clearTimerAndCheckDuration, { urls: ["<all_urls>"] });
chrome.webRequest.onErrorOccurred.addListener(clearTimerAndCheckDuration, { urls: ["<all_urls>"] });

// Function to check HTTP status code
async function checkHttpStatus(url, callback) {
    console.log(`Checking HTTP status for url: ${url}`);
    try {
        // Perform the fetch without 'no-cors'
        const response = await fetch(url, { method: 'HEAD' });
        callback(response.status); // We can now read the status code directly
    } catch (error) {
        console.error('HTTP Status Code Check Error:', error);
        callback(0); // 0 indicates an error
    }
}

function isContentSparse() {
    const bodyText = document.body.innerText || "";
    const minTextLength = 100; // define a threshold for text length
    const minElementCount = 10; // define a threshold for the number of elements
    const elementCount = document.body.getElementsByTagName('*').length;

    return bodyText.length < minTextLength && elementCount < minElementCount;
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'checkForSparseContent') {
        console.error('cghecking for sparse content');
        if (isContentSparse()) {
            chrome.runtime.sendMessage({ action: 'displayPopup', reason: 'Sparse content detected' });
        }
    }
});