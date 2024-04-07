function updateCacheContents() {
    // Send a message to the background script to get metrics
    console.error('Sending message to backgroudddddnd script');
    // chrome.tabs.sendMessage(sender.tab.id, { action: 'getAllMappings' });
    chrome.runtime.sendMessage({ action: 'getAllMappings' });

}


// Rest of your popup.js code for displaying other performance metrics
chrome.action.setBadgeText({ text: '' }, function() {
    console.log('Badge cleared');
});


// Call the function on popup open
updateCacheContents();




