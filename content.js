// Listener for messages from the background script
// chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

//     if (message.action === 'displayPopup') {
//         displayPopup();
//     } else {
//         console.log("got a generic message");
//     }
// });

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
