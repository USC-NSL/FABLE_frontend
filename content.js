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
        const dnsResponseCode = message.dnsResponseCode;
        const pageLoadTime = message.pageLoadTime;
        const ttfb = message.ttfb;  // TTFB data received from the message

        displayPopup(statusCode, currentTime, dnsResponseCode, pageLoadTime, ttfb);
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

// Displays the popup with various performance metrics
function displayPopup(statusCode, currentTime, dnsResponseCode, pageLoadTime, ttfb) {
    const popupDiv = document.createElement('div');
    popupDiv.innerHTML = `
        Current Time: ${currentTime}<br>
        HTTP Response Code: ${statusCode}<br>
        DNS Response Code: ${dnsResponseCode}<br>
        Page Load Time: ${pageLoadTime.toFixed(2)} ms<br>
        TTFB: ${ttfb.toFixed(2)} ms`; // Display the TTFB in the popup

    popupDiv.style.position = 'fixed';
    popupDiv.style.zIndex = 9999;
    popupDiv.style.top = '10px';
    popupDiv.style.left = '10px';
    popupDiv.style.backgroundColor = '#d1ffc4';
    popupDiv.style.border = '1px solid #ccc';
    popupDiv.style.padding = '10px';
    popupDiv.style.fontSize = '14px';
    popupDiv.style.color = 'black';
    
    document.body.appendChild(popupDiv);
}
