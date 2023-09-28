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
    // Check if the URL is an internal Chrome page or a non-standard URL
    if (!details.url.startsWith("chrome://")) {
        pageLoadStartTime = performance.now();
    }
});

chrome.webNavigation.onErrorOccurred.addListener(function(details) {
    // Check if the URL is an internal Chrome page or a non-standard URL
    if (!details.url.startsWith("chrome://")) {
        // Handle network errors
        const errorType = details.error;
        const errorDescription = getErrorDescription(errorType);

        // Send a message to the content script to show the popup with error information
        chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'showPopup',
                errorType: errorType,
                errorDescription: errorDescription,
                ttfb: ttfbValue,
                dnsResponseCode: "N/A", // Since it's an error, DNS response code is not applicable
                pageLoadTime: "N/A" // Since it's an error, page load time is not applicable
            });
        });
    }
});

// Function to get a description of the network error
function getErrorDescription(errorType) {
    switch (errorType) {
        case 'net::ERR_NAME_NOT_RESOLVED':
            return 'DNS resolution failure';
        case 'net::ERR_CONNECTION_TIMED_OUT':
            return 'Connection timed out';
        case 'net::ERR_CONNECTION_REFUSED':
            return 'Connection refused';
        case 'net::ERR_CONNECTION_RESET':
            return 'Connection reset';
        case 'net::ERR_SSL_PROTOCOL_ERROR':
            return 'SSL protocol error';
        case 'net::ERR_EMPTY_RESPONSE':
            return 'Empty response received';
        case 'net::ERR_BLOCKED_BY_CLIENT':
            return 'Blocked by client (e.g., ad blocker)';
        // Add more error types and descriptions as needed
        default:
            return 'Unknown error';
    }
}

chrome.webNavigation.onCompleted.addListener(function(details) {
    // Check if the URL is an internal Chrome page or a non-standard URL
    if (!details.url.startsWith("chrome://")) {
        // Calculate and log the page load time
        const pageLoadTime = calculatePageLoadTime();

        // Perform HTTP status code check for the current tab's URL
        const url = details.url;
        checkHttpStatus(url, async function(statusCode) {
            // Send a message to the content script to show the popup with the response code, page load time, DNS response code, and error information
            chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
                const dnsResponseCode = await getDNSResponseCode();  // Fetching DNS Response Code
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'showPopup',
                    statusCode: statusCode,
                    dnsResponseCode: dnsResponseCode,
                    pageLoadTime: pageLoadTime,
                    ttfb: ttfbValue,
                    errorType: "(No network layer errors)",
                    errorDescription: "(No network layer errors)" // Display a message indicating no error
                });
            });
        });
    }
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
