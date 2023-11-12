// background.js

// background.js

chrome.webRequest.onCompleted.addListener(
    function(details) {
        if (details.type === "main_frame" && details.frameId === 0 && !details.url.startsWith("chrome://")) {
            console.log('Main frame load detected for:', details.url);

            // Inject the content script
            if (details.tabId > 0) {
                chrome.scripting.executeScript({
                    target: { tabId: details.tabId },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Script injection failed:', chrome.runtime.lastError.message);
                        return;
                    }

                    // Check if the request returned a 404 status
                    if ((details.statusCode >= 400 && details.statusCode < 500) || (details.statusCode >= 500 && details.statusCode < 600)) {
                        console.log('Detected a 4xx or 5xx error for main frame:', details.url);
                        chrome.tabs.sendMessage(details.tabId, { action: 'displayPopup' });
                    } else {
                        // If status code is not in the 400s or 500s, check the title
                        chrome.tabs.sendMessage(details.tabId, { action: 'checkTitleFor404' });
                        chrome.tabs.sendMessage(details.tabId, { action: 'checkForSparseContent' });
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