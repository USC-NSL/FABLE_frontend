let ttfbValue = 0;  // Store the TTFB value received from content script

// Listener for messages from the content script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'ttfb') {
        ttfbValue = message.value;
    }
});

// Define variables to measure page load time
let pageLoadStartTime;

chrome.webNavigation.onCommitted.addListener(function(details) {
    // Start measuring page load time
    pageLoadStartTime = performance.now();
});

chrome.webNavigation.onCompleted.addListener(async function(details) {
    // Calculate and log the page load time
    const pageLoadTime = calculatePageLoadTime();

    // Perform HTTP status code check for the current tab's URL
    const url = details.url;
    checkHttpStatus(url, async function(statusCode) {
        // Send a message to the content script to show the popup with the response code and page load time
        chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
            const dnsResponseCode = await getDNSResponseCode();  // Fetching DNS Response Code
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'showPopup',
                statusCode: statusCode,
                dnsResponseCode: dnsResponseCode,
                pageLoadTime: pageLoadTime,
                ttfb: ttfbValue  // Send the stored TTFB value
            });
        });
    });
});


// Function to calculate page load time
function calculatePageLoadTime() {
    if (pageLoadStartTime) {
        const pageLoadEndTime = performance.now();
        return pageLoadEndTime - pageLoadStartTime;
    } else {
        return 'Page load time not available';
    }
}

// Function to check HTTP status code
async function checkHttpStatus(url, callback) {
    try {
        const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        if (response) {
            const statusCode = response.status;
            callback(statusCode);
        } else {
            console.error('HTTP Status Code Check Error: Response is null or undefined');
            callback(0);  // 0 indicates an error
        }
    } catch (error) {
        console.error('HTTP Status Code Check Error:', error);
        callback(0);  // 0 indicates an error
    }
}

// Function to get DNS Response Code (simulating using a fetch to a known endpoint)
async function getDNSResponseCode() {
    try {
        const response = await fetch('https://example.com', { method: 'HEAD', mode: 'no-cors' });
        if (response) {
            return response.status;
        } else {
            return 'Failed to fetch DNS response code';
        }
    } catch (error) {
        console.error('DNS Response Code Check Error:', error);
        return 'Failed to fetch DNS response code';
    }
}
