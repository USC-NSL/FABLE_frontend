// Calculate the TTFB (Time To First Byte)
function getTTFB() {
    const performanceTiming = window.performance.timing;
    return performanceTiming.responseStart - performanceTiming.navigationStart;
}

// Send the TTFB value to the background script
const ttfb = getTTFB();
chrome.runtime.sendMessage({ action: 'ttfb', value: ttfb });

// Listener for messages from the background script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'showPopup') {
        const statusCode = message.statusCode;
        const currentTime = getCurrentTime();
        // const dnsResponseCode = message.dnsResponseCode;
        const pageLoadTime = message.pageLoadTime;
        const ttfb = message.ttfb;  // TTFB data received from the message
        const errorType = message.errorType;  // Error type received from the message
        const errorDescription = message.errorDescription;  // Error description received from the message
        displayPopup(statusCode, currentTime, pageLoadTime, ttfb, errorType, errorDescription);
    }
});

// Returns the current time in HH:MM:SS format
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Displays the banner with various performance metrics and error information
function displayPopup(statusCode, currentTime, pageLoadTime, ttfb, errorType, errorDescription) {
    const bannerDiv = document.createElement('div');

    bannerDiv.innerHTML = `
        <div style="display: inline-block; white-space: nowrap;">
            <span>Current Time: ${currentTime}</span> |
            <span>HTTP Response Code: ${statusCode}</span> |
            <span>Page Load Time: ${pageLoadTime.toFixed(2)} ms</span> |
            <span>TTFB: ${ttfb.toFixed(2)} ms</span> |
            <span>Error Type: ${errorType}</span> |
            <span>Error Description: ${errorDescription}</span>
        </div>
        <div style="float: right; display: inline-block; outline: none">
        <a href="https://www.google.com" style="background-color: #4285F4; color: white; padding: 8px 20px; margin: 2px 10px 2px 0; text-decoration: none; border-radius: 5px; outline: none;">Go to fixed link</a>
        <span style="cursor: pointer;" onclick="this.parentElement.parentElement.remove(); document.body.style.marginTop = '0'; outline: none">✕</span>
        </div>`;
    
    bannerDiv.style.position = 'fixed';
    bannerDiv.style.zIndex = 9999;
    bannerDiv.style.top = '0'; 
    bannerDiv.style.left = '0';
    bannerDiv.style.right = '0'; 
    bannerDiv.style.backgroundColor = '#d1ffc4';
    bannerDiv.style.borderBottom = '1px solid #ccc';
    bannerDiv.style.padding = '10px';
    bannerDiv.style.fontSize = '14px';
    bannerDiv.style.color = 'black';
    bannerDiv.style.overflow = 'hidden'; 

    document.body.insertBefore(bannerDiv, document.body.firstChild);

    // After adding to the document, set the margin-top of the body to push content downwards.
    document.body.style.marginTop = `${bannerDiv.offsetHeight}px`;
}





