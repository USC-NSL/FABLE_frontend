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
// Displays the banner with various performance metrics and error information
// Displays the banner with various performance metrics and error information
// Displays the banner with various performance metrics and error information
// Displays the banner with various performance metrics and error information
// Displays the banner with various performance metrics and error information
// Displays the banner with various performance metrics and error information
// Displays the banner with various performance metrics and error information
function displayPopup(statusCode, currentTime, pageLoadTime, ttfb, errorType, errorDescription) {
    const bannerDiv = document.createElement('div');

    bannerDiv.innerHTML = `
        <div style="display: flex; align-items: center; height: 35px;">
            <span style="font-size: 36px;">⚠︎</span>
            <span style="margin-left: 10px;"><b>Sorry, this link is broken.</b> Do you want to check for a fixed link using FABLE?</span>
            <div style="flex-grow: 1;"></div> <!-- Spacer to push buttons to the right -->
            <div style="display: flex; align-items: center;">
                <a href="https://www.google.com" style="background-color: #4285F4; color: white; padding: 8px 15px; text-decoration: none; border-radius: 5px; outline: none; margin-right: 5px;">Go to fixed link</a>
                <span id="closeBanner" style="cursor: pointer; margin-left: 5px;">✕</span>
            </div>
        </div>`;

    // Apply styles to the banner
    bannerDiv.style.position = 'fixed';
    bannerDiv.style.zIndex = 9999;
    bannerDiv.style.top = '0';
    bannerDiv.style.left = '0';
    bannerDiv.style.right = '0';
    bannerDiv.style.backgroundColor = '#F9F9F9';
    bannerDiv.style.borderBottom = '1px solid #ccc';
    bannerDiv.style.padding = '10px';
    bannerDiv.style.fontSize = '17px';
    bannerDiv.style.color = 'black';
    bannerDiv.style.overflow = 'hidden';

    document.body.insertBefore(bannerDiv, document.body.firstChild);

    // After adding to the document, set the margin-top of the body to push content downwards.
    document.body.style.marginTop = `${bannerDiv.offsetHeight}px`;

    // Add an event listener to the "X" button to remove the banner
    document.getElementById('closeBanner').addEventListener('click', function () {
        bannerDiv.remove();
        document.body.style.marginTop = '0';
    });
}










