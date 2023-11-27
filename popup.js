function updatePopupContent() {
    // Send a message to the background script to get metrics

}

//soft 404

// popup.js

// Function to update the list of soft 404 URLs in the popup
// popup.js

// Function to request soft 404 URLs from the background script
function requestSoft404Urls() {

}

// Function to update the list of soft 404 URLs in the popup
function updateSoft404List(urls) {

}

// Call the function to request soft 404 URLs when the popup is opened
requestSoft404Urls();


// Rest of your popup.js code for displaying other performance metrics
chrome.action.setBadgeText({ text: '' }, function() {
    console.log('Badge cleared');
});


// Call the function on popup open
updatePopupContent();


