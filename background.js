let ttfbValue = 0;  // Store the TTFB value received from content script

let lastMetrics = {
    statusCode: null,
    currentTime: null,
    // dnsResponseCode: null,
    pageLoadTime: null,
    ttfb: null,
    errorType: null,
    errorDescription: null
};


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


chrome.webNavigation.onErrorOccurred.addListener(function(details) {
    // Check if it's the main frame and not an internal Chrome page or a non-standard URL
    if (details.frameId === 0 && !details.url.startsWith("chrome://")) {
        const errorType = details.error;
        const errorDescription = getErrorDescription(errorType);
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'showPopup',
                errorType: errorType,
                errorDescription: errorDescription,
                ttfb: ttfbValue,
                pageLoadTime: "N/A" // Since it's a network error, page load time might not be applicable
            });
        });
    }
});

chrome.webNavigation.onCompleted.addListener(function(details) {
    // Check if it's the main frame and not an internal Chrome page
    if (details.frameId === 0 && !details.url.startsWith("chrome://")) {
        const url = details.url;
        checkHttpStatus(url, function(statusCode) {
            if (statusCode >= 400) {
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'showPopup',
                        statusCode: statusCode,
                        pageLoadTime: calculatePageLoadTime(),
                        ttfb: ttfbValue,
                        errorType: "(HTTP Error)",
                        errorDescription: `HTTP ${statusCode} Error` 
                    });
                });
            }
        });
    }
});




chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getMetrics') {
        sendResponse(lastMetrics);
    }
});


function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

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
    console.log("Attempting to fetch DNS response code");

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

//taken  to the new location predicted by FABLE


//soft 404

// Create an array to store URLs that lead to potential soft 404s
// background.js

// Create an array to store URLs that lead to potential soft 404s
const soft404Urls = [];

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'soft404') {
        // Store the URL that potentially leads to a soft 404
        soft404Urls.push(message.url);
    }
});

// background.js

// ... (previously defined soft404Urls and message listener)

// Listen for requests for soft 404 URLs from the popup
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'getSoft404Urls') {
        // Send the list of soft 404 URLs to the popup
        sendResponse(soft404Urls);
    }
});



