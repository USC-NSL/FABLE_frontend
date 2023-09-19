// content.js

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'showPopup') {
      const statusCode = message.statusCode;
      displayPopup(statusCode);
    }
  });
  
  function displayPopup(statusCode) {
    const popupDiv = document.createElement('div');
    popupDiv.innerHTML = `HTTP Response Code: ${statusCode}`;
    popupDiv.style.position = 'fixed';
    popupDiv.style.zIndex = 9999;
    popupDiv.style.top = '10px';
    popupDiv.style.left = '10px';
    popupDiv.style.backgroundColor = '#fff';
    popupDiv.style.border = '1px solid #ccc';
    popupDiv.style.padding = '10px';
    popupDiv.style.fontSize = '14px';
    document.body.appendChild(popupDiv);
    setTimeout(() => {
      popupDiv.remove(); // Remove the popup after a few seconds (adjust as needed)
    }, 5000); // Remove after 5 seconds (adjust as needed)
  }
  