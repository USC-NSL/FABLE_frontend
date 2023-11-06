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

// soft 404

// Function to check if two URLs redirect to the same place
// Function to check if the URL redirects to a different location
async function checkRedirects() {
    const currentUrl = window.location.href;

    // Fetch the final URL after following redirects
    const finalUrl = await getFinalUrl(currentUrl);
    
    console.log('Final URL:', finalUrl);

    // If the final URL is different from the current URL, then a redirect has occurred
    if (finalUrl !== currentUrl) {
        console.log('Redirect detected. Current URL:', currentUrl, 'Final URL:', finalUrl);
        // Send a message to the background script indicating a redirect has been detected
        chrome.runtime.sendMessage({ action: 'redirectDetected', currentUrl: currentUrl, finalUrl: finalUrl });
    } else {
        console.log('No redirect detected for URL:', currentUrl);
    }
}

// Ensure you call this function in the appropriate context where it makes sense in your extension workflow

// do not issue duplicate requests for page we are looking at - getFinalUrl

//show demo with test cases:
// create webpage that redirects a b c-404
// have broken image on webpage that 404s but the original webpage request works fine

//adversarial test cases



//timeouts:
//put random ip address in the hostname

//tls connection setup errors: certificate not valid




// Function to fetch the final URL after following redirects
async function getFinalUrl(url) {
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow'  // Now fetch will follow redirects
        });
        // The final URL is available in the response.url
        return response.url;
    } catch (error) {
        console.error('Error following redirects:', error);
        return url; // In case of an error, return the original URL
    }
}


// Call the checkRedirects function
checkRedirects();

// content.js

// Function to check if the current page is an error page
function checkForErrorPage() {
    const errorIndicators = [
        // "404",
        // "error 404",
        // "404 not found",
        // "error",
        // "page not found",
        // "we can't find the page",
        // "this page isn’t available",
        // "oops",
        // "the page you are looking for can't be found",
        // "something went wrong",
        // "we're sorry, but something went wrong",
        // "the page you requested does not exist",
        // "this page has gone missing",
        // "you seem to be trying to find his way home",
        // "this is somewhat embarrassing, isn’t it?",
        // "it looks like nothing was found at this location",
        // "the requested URL was not found on this server",
        // "the page you are looking for does not exist",
        // "the page you are looking for seems to be missing",
        // "this page is missing",
        // "looks like you have taken a wrong turn",
        // "dead link",
        // "the link you clicked may be broken",
        // "unable to find the page",
        // "we have encountered a problem",
        // "the resource you are looking for might have been removed",
        // "had its name changed",
        // "is temporarily unavailable",
        // "please try again later",
        // "error code: 404",
        // "HTTP 404",
        // "404 error",
        // "404 page",
        // "error page",
        // "invalid URL",
        // "file not found",
        // "broken link",
        // "this page doesn’t exist",
        // "address not found",
        // "this link isn’t working",
        // "no page here",
        // "why am I here?",
        // "404. That’s an error.",
        // "the requested resource is not available",
        // "there's nothing here",
        // "nothing to see here",
        // "page does not exist",
        // "gone",
        // "this URL is invalid",
        // "404’d",
        // "404. Page not found",
        // "404. This is not the web page you are looking for",
        // "we couldn’t find that page",
        // "404. Oops!",
        // "404 page not exist",
        // "404 not found error"
    ];

    const pageContent = document.body.textContent || document.body.innerText;
    
    // Find and log the matched indicator
    const matchedIndicator = errorIndicators.find(indicator =>
        pageContent.toLowerCase().includes(indicator.toLowerCase())
    );

    if (matchedIndicator) {
        console.log(`Soft 404 detected via page contents: "${matchedIndicator}"`);
        chrome.runtime.sendMessage({ action: 'soft404', url: window.location.href, message: matchedIndicator });
    } else {
        console.log('No soft 404 detected.');
    }
}


// Call the checkForErrorPage function
checkForErrorPage();












