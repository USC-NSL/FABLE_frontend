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

    // Check if the popup already exists to avoid duplicates
    if (!document.getElementById('popup-container')) {
        const popupContainer = document.createElement('div');
        popupContainer.id = "popup-container";

        // Popup HTML content with new wording and close button as 'X'
        popupContainer.innerHTML = `
            <div id="title-txt" style="position: relative; padding: 10px; background-color: #e51d21; color: white; border-radius: 5px 5px 0 0; overflow: hidden;">
                404: Not Found
                <span id="close-btn" style="cursor: pointer; position: absolute; top: 50%; transform: translateY(-50%); right: 10px; font-size: 1em; color: white;">✕</span>
            </div>
            <div style="padding: 10px; text-align: center;">
                <img src="https://www.shutterstock.com/image-vector/broken-chain-symbol-change-slavery-600nw-2142272695.jpg" style="width: 150px; height: 150px;">
                <div style="font-size: 14px; margin-top: 10px;"><b>Sorry, this link is broken.</b><br> Do you want to check for a fixed link using FABLE?</div>
                <a href="https://www.google.com" id="archive-btn">Go to fixed link</a>
            </div>
        `;

        // CSS styles applied directly to the popup container
        Object.assign(popupContainer.style, {
            position: 'fixed',
            zIndex: '2147483647',
            width: '350px',
            top: '10px',
            right: '10px',
            backgroundColor: 'white',
            borderRadius: '5px',
            boxShadow: '0 3px 5px 0 rgba(0,0,0,.3)',
            fontFamily: `'Arial', sans-serif`,
            fontSize: '12pt',
            animation: 'fadein 0.8s ease-out'
        });

        // Close button event
        const closeButton = popupContainer.querySelector('#close-btn');
        closeButton.addEventListener("click", function() {
            document.body.removeChild(popupContainer);
        });

        // Archive button styling
        const archiveButton = popupContainer.querySelector('#archive-btn');
        Object.assign(archiveButton.style, {
            display: 'inline-block',
            backgroundColor: '#e51d21',
            color: 'white',
            textDecoration: 'none',
            padding: '8px 15px',
            borderRadius: '5px',
            marginTop: '10px'
        });

        // Append the popup to the body
        document.body.appendChild(popupContainer);
    }
}
