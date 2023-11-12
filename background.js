// background.js
// console.log('Background script loaded');

// background.js

// Listener for web requests starting
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        // console.log('Web request started for:', details.url, 'Type:', details.type, 'FrameID:', details.frameId);
        // Additional logic can be added here if needed
    },
    { urls: ["<all_urls>"] }
);


chrome.webRequest.onCompleted.addListener(
    function(details) {
        // console.log('Web request completed for:', details.url, 'Type:', details.type, 'FrameID:', details.frameId, 'StatusCode:', details.statusCode);
        if (details.type !== "main_frame") {
            // console.log('Ignoring request - Not a main frame request:', details.url);
        }

        if (details.frameId !== 0) {
            // console.log('Ignoring request - Not top-level frame request:', details.url);
        }

        if (details.url.startsWith("chrome://")) {
            // console.log('Ignoring request - Chrome internal page:', details.url);
        }
        if (details.type === "main_frame" && details.frameId === 0 && !details.url.startsWith("chrome://")) {
            // console.log('Main frame load detected for:', details.url);

            if (details.tabId > 0) {
                // console.log('Injecting content script for URL:', details.url);
                chrome.scripting.executeScript({
                    target: { tabId: details.tabId },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        // console.error('Script injection failed:', chrome.runtime.lastError.message);
                    } else {
                        // console.log('Content script injected successfully for URL:', details.url);

                        if ((details.statusCode >= 400 && details.statusCode < 500) || (details.statusCode >= 500 && details.statusCode < 600)) {
                            console.log('Detected a 4xx or 5xx error for main frame:', details.url);
                            chrome.tabs.sendMessage(details.tabId, { action: 'displayPopup' });
                        } else {
                            console.log('Initiating heuristic scoring for URL:', details.url);
                            chrome.tabs.sendMessage(details.tabId, { action: 'initiateScoring', url: details.url });
                        }
                    }
                });
            }
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

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