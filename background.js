// background.js
// console.log('Background script loaded');

// background.js
let contentScriptsReadyTabs = new Set();


// Listener for web requests starting
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        // console.log('Web request started for:', details.url, 'Type:', details.type, 'FrameID:', details.frameId);
        // Additional logic can be added here if needed
    },
    { urls: ["<all_urls>"] }
);

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    // Check if the tab is fully loaded
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith("chrome://")) {
        console.log('Tab load complete:', tab.url);

        // Inject the content script
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Script injection failed:', chrome.runtime.lastError.message);
            } else {
                console.log('Content script injected successfully for URL:', tab.url);

                // Now, we can send the message to initiate scoring
                // Note: You might want to add additional checks here based on your requirements
                console.log('Initiating heuristic scoring for URL:', tab.url);
                sendMessageWithRetry(tabId, { action: 'initiateScoring', url: tab.url });
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