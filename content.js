function initializeContentScript() {
    window.isContentScriptReady = true;
    chrome.runtime.sendMessage({ action: 'contentScriptReady' });
}

// Call the function to initialize the content script
initializeContentScript();

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'displayPopup') {
        console.log('got message to dsiplay popup');
        displayPopup();
    }
});

function checkForUnusualRedirects() {
    console.log('check for unusal redirects');

    const navigationEntries = performance.getEntriesByType("navigation");
    let redirectScore = 0;

    navigationEntries.forEach((entry, index) => {
        if (index > 0 && navigationEntries[index - 1].name !== entry.name) {
            redirectScore += 1;
        }
    });

    return redirectScore;
}

// Function to check if a link is dead or alive
async function checkLinkStatus(url) {
    console.log('check link status');

    try {
        const response = await fetch(url, { method: 'GET' });
        const httpCode = response.status;
        const effectiveUrl = response.url;
        const effectiveUrlClean = cleanURL(effectiveUrl);

        if (httpCode >= 400 && httpCode < 600) {
            return true;
        }

        if (checkRedirectTo404(effectiveUrlClean)) {
            console.log('checkrediectto404 returned TRUE');
            return true;
        }

        if (effectiveUrlClean !== cleanURL(url)) {
            const possibleRoots = getDomainRoots(url);
            if (possibleRoots.includes(effectiveUrlClean)) {
                console.log('looked at the roots and TRUE');
                return true;
            }
        }

        if (httpCode === 0) {
            return true;
        }

        return false;
    } catch (error) {
        console.error("Fetch error: ", error.message);
        return true;
    }
}

// Function to clean the URL (remove scheme, 'www', trailing slash)
function cleanURL(url) {
    console.log('clean url');

    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '') + urlObj.pathname.replace(/\/$/, '');
    } catch (e) {
        console.error("Invalid URL: ", url);
        return '';
    }
}

// Function to get domain roots for a given URL
function getDomainRoots(url) {
    console.log('get domain roots');
    try {
        const urlObj = new URL(url);
        return [urlObj.hostname.replace('www.', ''), urlObj.origin.replace(/^https?:\/\//, '').replace('www.', '')];
    } catch (e) {
        console.error("Invalid URL: ", url);
        return [];
    }
}

function checkRedirectTo404(effectiveUrlClean) {
    console.log('check redirect to 404');
    return /\/404.htm|\/404\/|notfound|notfoundsoft/i.test(effectiveUrlClean);
}


// Receiving message to initiate scoring
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'initiateScoring') {
        console.log('Received initiateScoring message for URL:', message.url);
        checkLinkStatus(message.url).then(isDead => {
            if (isDead) {
                console.log('Link is dead, displaying popup');
                chrome.runtime.sendMessage({ action: 'displayPopup' });
            } else {
                console.log('Link is alive, no action required');
            }
        });
        sendResponse({status: "Scoring initiated"});
    }
    return true;
});
function displayPopup() {
    console.log("Content Script: Displaying popup");

    const bannerDiv = document.createElement('div');
    bannerDiv.id = "BANNERID";

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

    // Apply styles directly in JavaScript
    bannerDiv.style.position = 'relative';
    bannerDiv.style.width = '100%';
    bannerDiv.style.backgroundColor = '#F9F9F9';
    bannerDiv.style.borderBottom = '1px solid #ccc';
    bannerDiv.style.padding = '10px';
    bannerDiv.style.fontSize = '17px';
    bannerDiv.style.color = 'black';
    bannerDiv.style.overflow = 'hidden';
    bannerDiv.style.boxSizing = 'border-box'; // Ensure padding is included in width

    // Event listener for closing the banner
    bannerDiv.querySelector("#closeBanner").addEventListener("click", function() {
        document.body.style.marginTop = ''; // Reset the body's margin-top
        document.body.removeChild(bannerDiv);
    });

    if (document.body) {
        document.body.style.marginTop = bannerDiv.offsetHeight + 'px';
        document.body.insertBefore(bannerDiv, document.body.firstChild);
    } else {
        const observer = new MutationObserver(() => {
            if (document.body) {
                observer.disconnect();
                document.body.style.marginTop = bannerDiv.offsetHeight + 'px';
                document.body.insertBefore(bannerDiv, document.body.firstChild);
            }
        });
        observer.observe(document.documentElement, { childList: true });
    }
}
