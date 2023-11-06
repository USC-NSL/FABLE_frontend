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
    console.log(`Message received from content script: ${message.action}`);
    if (message.action === 'ttfb') {
        console.log(`TTFB value received: ${message.value}`);
        ttfbValue = message.value;
    }
});

// Define variables to measure page load time
let pageLoadStartTime;

chrome.webNavigation.onCommitted.addListener(function(details) {
    console.log(`Navigation committed for url: ${details.url}`);
    if (!details.url.startsWith("chrome://")) {
        console.log(`Starting page load time measurement for url: ${details.url}`);
        pageLoadStartTime = performance.now();
    }
});


// Function to get a description of the network error
function getErrorDescription(errorType) {
    console.log(`Getting error description for error type: ${errorType}`);
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
            console.log(`Unknown error type received: ${errorType}`);
            return 'Unknown error';
    }
}

//is this just html or e.g. js
//no iframe but missing image or css file
//focusing only on iframes may not be sufficient
//debug console show on all places onERrorOccured is called 

//webRequest.onErrorOccurred
// Listener for errors on a per-resource basis
chrome.webRequest.onErrorOccurred.addListener(
    function (details) {
        console.log(`Web request error: ${details.error} for url: ${details.url}`);

        // Prepare the error details
        const errorType = details.error;
        const errorDescription = getResourceErrorDescription(errorType);

        // Store the error information in lastMetrics or handle it as needed
        lastMetrics.errorType = errorType;
        lastMetrics.errorDescription = errorDescription;

        // Here you can choose to send a message to the content script if needed,
        // or you could just log the error, or store it for further processing.
        // Example:
        if (details.tabId > 0) {
            chrome.tabs.sendMessage(details.tabId, {
                action: 'logError',
                errorType: errorType,
                errorDescription: errorDescription
            });
        }

        // If the error URL matches a specific pattern, you might consider it a soft 404
        if (details.url && somePatternThatIndicatesSoft404(details.url)) {
            soft404Urls.push(details.url);
        }

        // ... your additional logic for handling the error
    },
    { urls: ["<all_urls>"] } // Use appropriate filters as needed
);

// Helper function to determine soft 404 (this is a simple example, replace with your actual logic)
function somePatternThatIndicatesSoft404(url) {
    // Example: a URL that does not end with a file extension might be a dynamic page that could soft 404
    return !url.match(/\.\w+($|\?)/);
}


chrome.webNavigation.onErrorOccurred.addListener(function(details) {
    console.log(`Error occurred for url: ${details.url} with error: ${details.error}`);
    if (details.frameId === 0 && !details.url.startsWith("chrome://")) {
        const errorType = details.error;
        const errorDescription = getErrorDescription(errorType);
        console.log(`Sending error message to content script for url: ${details.url}`);
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

// This function will return a custom error description
function getResourceErrorDescription(error) {
    switch (error) {
        case 'net::ERR_ABORTED':
            return 'The request was aborted.';
        case 'net::ERR_FAILED':
            return 'The request failed.';
        // ... (include other specific cases you want to handle)
        default:
            return 'An unknown error occurred.';
    }
}

chrome.webNavigation.onCompleted.addListener(function(details) {
    // Check if it's the main frame and not an internal Chrome page
    console.log('Navigation completed for:', details.url, 'in tab:', details.tabId, 'frame:', details.frameId);

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
    console.log(`Message received for action: ${message.action}`);
    if (message.action === 'getMetrics') {
        console.log(`Sending metrics to content script.`);
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
    console.log(`Calculating page load time.`);
    if (pageLoadStartTime) {
        const pageLoadEndTime = performance.now();
        return pageLoadEndTime - pageLoadStartTime;
    } else {
        return 'Page load time not available';
    }
}

// Function to check HTTP status code
async function checkHttpStatus(url, callback) {
    console.log(`Checking HTTP status for url: ${url}`);
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
    console.log(`Fetching DNS response code.`);
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
    console.log(`Message received for action: ${message.action}`);
    if (message.action === 'soft404') {
        console.log(`Potential soft 404 detected for url: ${message.url}`);
        soft404Urls.push(message.url);
    }
});

// background.js

// ... (previously defined soft404Urls and message listener)

// Listen for requests for soft 404 URLs from the popup
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log(`Message received for action: ${message.action}`);
    if (message.action === 'getSoft404Urls') {
        console.log(`Sending soft 404 URLs to the sender.`);
        sendResponse(soft404Urls);
    }
});



