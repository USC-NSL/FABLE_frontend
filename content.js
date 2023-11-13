// Listener for messages from the background script
// chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

//     if (message.action === 'displayPopup') {
//         displayPopup();
//     } else {
//         console.log("got a generic message");
//     }
// });

// Flag to indicate readiness
window.isContentScriptReady = true;

// Send a message back to background script to confirm readiness
chrome.runtime.sendMessage({ action: 'contentScriptReady' });

// content.js

// content.js

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'checkTitleFor404') {
        const pageTitle = document.title;
        if (pageTitle.includes('404')) {
            chrome.runtime.sendMessage({ action: 'displayPopupForTitle404' });
        }
    }
    if (message.action === 'checkForSparseContent') {
        if (isContentSparse()) {
            chrome.runtime.sendMessage({ action: 'displayPopupForSparseContent' });
        }
    } else if (message.action === 'checkTitleFor404') {
        const pageTitle = document.title;
        if (pageTitle.includes('404')) {
            chrome.runtime.sendMessage({ action: 'displayPopupForTitle404' });
        }
    }

    if (message.action === 'displayPopup') {
        displayPopup();
    }
});

function checkForUnusualRedirects() {
    const navigationEntries = performance.getEntriesByType("navigation");
    let redirectScore = 0;

    navigationEntries.forEach((entry, index) => {
        if (index > 0 && navigationEntries[index - 1].name !== entry.name) {
            // Each unique redirect adds a point
            redirectScore += 1;
        }
    });

    return redirectScore;
}

function performHeuristicScoring(url) {
    let score = 0;

    // Keywords in Title
    let titleScore = document.title.includes('404') ? 3 : 0;
    console.log('Title Score:', titleScore);
    score += titleScore;

    // Keywords in Content
    let contentScore = contentHasKeywords(['Not Found', 'Error', '404']) ? 2 : 0;
    console.log('Content Keywords Score:', contentScore);
    score += contentScore;

    // Extremely Sparse Content
    let sparseScore = isContentSparse() ? 4 : 0;
    console.log('Sparse Content Score:', sparseScore);
    score += sparseScore;

    // Mismatch Between URL Path and Content (Placeholder)
    let urlMismatchScore = checkMismatchBetweenURLandContent(url);  // Currently not implemented
    console.log('URL-Content Mismatch Score:', urlMismatchScore);
    score += urlMismatchScore;

    // Unusual Redirects or Refreshes (Placeholder)
    let redirectScore = checkForUnusualRedirects();
    console.log('Redirects/Refreshes Score:', redirectScore);
    score += redirectScore;


    // Send the score back to background.js
    console.log('Total Heuristic Score:', score);
    chrome.runtime.sendMessage({ action: 'displayPopupBasedOnScore', score: score });

    if (score === 0) {
        requestBrowserPopup("Click to check for a fixed link using FABLE");
    }
    
}

// Function to request a browser notification
function requestBrowserPopup(message) {
    chrome.runtime.sendMessage({ action: 'showBrowserPopup', message: message });
}


function contentHasKeywords(keywords) {
    const bodyText = document.body.innerText || "";
    return keywords.some(keyword => bodyText.includes(keyword));
}

function checkMismatchBetweenURLandContent(url) {
    console.log('Checking for mismatch between URL and content (not implemented)');
    return 0; // Placeholder return
}

function checkForStandardErrorElements() {
    console.log('Checking for standard error page elements (not implemented)');
    return 0; // Placeholder return
}

function checkForUnusualRedirectsOrRefreshes() {
    console.log('Checking for unusual redirects or refreshes (not implemented)');
    return 0; // Placeholder return
}

// Receiving message to initiate scoring
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'initiateScoring') {
        // Log the URL received for scoring
        console.log('Received initiateScoring message for URL:', message.url);
        performHeuristicScoring(message.url);
        sendResponse({status: "Scoring initiated"});

    }
    return true; // Important for asynchronous response

});

function isContentSparse() {
    const bodyText = document.body.innerText || "";
    const minTextLength = 100; // define a threshold for text length
    const minElementCount = 10; // define a threshold for the number of elements
    const elementCount = document.body.getElementsByTagName('*').length;

    return bodyText.length < minTextLength && elementCount < minElementCount;
}


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

if (document.body) {
    document.body.insertBefore(bannerDiv, document.body.firstChild);
  } else {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        document.body.insertBefore(bannerDiv, document.body.firstChild);
      }
    });

    observer.observe(document.documentElement, { childList: true });
  }
}

// displayPopup();
