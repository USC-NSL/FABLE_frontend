// content.js

chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
    if (message.action === 'showPopup') {
      const statusCode = message.statusCode;
      const currentTime = getCurrentTime(); // Get the current time
      const dnsResponseCode = await getDNSResponseCode(); // Get DNS response code
      const pageLoadTime = message.pageLoadTime; // Get the page load time from the message
  
      displayPopup(statusCode, currentTime, dnsResponseCode, pageLoadTime);
    }
  });
  
  function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  
  async function getDNSResponseCode() {
    try {
      const response = await fetch('https://example.com', { method: 'HEAD', mode: 'no-cors' });
      if (response) {
        const dnsResponseCode = response.status;
        return dnsResponseCode;
      } else {
        return 'Failed to fetch DNS response code';
      }
    } catch (error) {
      console.error('DNS Response Code Check Error:', error);
      return 'Failed to fetch DNS response code';
    }
  }
  
  function displayPopup(statusCode, currentTime, dnsResponseCode, pageLoadTime) {
    const popupDiv = document.createElement('div');
    popupDiv.innerHTML = `Current Time: ${currentTime}<br>HTTP Response Code: ${statusCode}<br>DNS Response Code: ${dnsResponseCode}<br>Page Load Time: ${pageLoadTime.toFixed(2)} ms`;
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
    // setTimeout(() => {
    //   popupDiv.remove();
    // }, 5000);
  }
  