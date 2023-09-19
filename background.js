// Background Script (background.js)

// Define variables to measure page load time
let pageLoadStartTime;

chrome.webNavigation.onCommitted.addListener(function (details) {
  // Extract the URL of the committed navigation
  const url = details.url;

  // Log the URL to the console for debugging
  console.log('Navigation Committed for URL:', url);

  // Start measuring page load time
  pageLoadStartTime = performance.now();
});

chrome.webNavigation.onCompleted.addListener(async function (details) {
  // Extract the URL of the completed navigation
  const url = details.url;

  // Log the URL to the console for debugging
  console.log('Navigation Completed for URL:', url);

  // Calculate and log the page load time
  const pageLoadTime = calculatePageLoadTime();
  console.log('Page Load Time (ms):', pageLoadTime);

  // Perform HTTP status code check for the current tab's URL
  checkHttpStatus(url, function (statusCode) {
    // Send a message to the content script to show the popup with the response code and page load time
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'showPopup', statusCode: statusCode, pageLoadTime: pageLoadTime });
    });
  });
});

// Function to calculate page load time
function calculatePageLoadTime() {
  if (pageLoadStartTime) {
    const pageLoadEndTime = performance.now();
    return pageLoadEndTime - pageLoadStartTime;
  } else {
    return 'Page load time not available';
  }
}

// Function to check HTTP status code
async function checkHttpStatus(url, callback) {
  try {
    // Log the HTTP status code check attempt for debugging
    console.log('Checking HTTP Status Code for URL:', url);

    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });

    if (response) {
      const statusCode = response.status;

      // Pass the HTTP status code to the callback
      callback(statusCode);
    } else {
      console.error('HTTP Status Code Check Error: Response is null or undefined');
      callback(0); // 0 indicates an error
    }
  } catch (error) {
    // An error occurred while checking the HTTP status code
    console.error('HTTP Status Code Check Error:', error);
    callback(0); // 0 indicates an error
  }
}
