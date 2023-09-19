// content.js

// Function to display a popup based on HTTP status code
function showPopup(statusCode) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '0';
    popup.style.right = '0';
    popup.style.backgroundColor = 'white';
    popup.style.border = '1px solid #ccc';
    popup.style.padding = '10px';
    popup.style.zIndex = '9999';
  
    if (statusCode === 200) {
      popup.innerHTML = '<h1>Status: <span style="color: green;">Success</span></h1>';
    } else {
      popup.innerHTML = '<h1>Status: <span style="color: red;">Failure</span></h1>';
    }
  
    document.body.appendChild(popup);
  
    // Close the popup after a few seconds (you can adjust the timeout)
    setTimeout(() => {
      document.body.removeChild(popup);
    }, 5000);
  }
  
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.action === 'showPopup') {
      showPopup(message.statusCode);
    }
  });
  