function updatePopupContent() {
    // Send a message to the background script to get metrics
    chrome.runtime.sendMessage({ action: 'getMetrics' }, function (metrics) {
        console.log("Fetched metrics from background:", metrics); // Log the fetched metrics

        // Function to round the pageLoadTime to the nearest millisecond and add "ms" at the end
        function formatPageLoadTime(time) {
            return time !== undefined ? Math.round(time) + " ms" : '-';
        }

        document.getElementById('currentTime').textContent = metrics.currentTime || '-';
        document.getElementById('statusCode').textContent = metrics.statusCode || '-';
        // document.getElementById('dnsResponseCode').textContent = metrics.dnsResponseCode || '-';
        document.getElementById('pageLoadTime').textContent = formatPageLoadTime(metrics.pageLoadTime);
        document.getElementById('ttfb').textContent = metrics.ttfb || '-';
        document.getElementById('errorType').textContent = metrics.errorType || '-';
        document.getElementById('errorDescription').textContent = metrics.errorDescription || '-';

        console.log('Set currentTime:', document.getElementById('currentTime').textContent);
    });
}

//soft 404

// popup.js

// Function to update the list of soft 404 URLs in the popup
// function updateSoft404List() {
//     const soft404List = document.getElementById('soft404List');
//     soft404List.innerHTML = '';

//     // Add each soft 404 URL to the list
//     for (const url of soft404Urls) {
//         const listItem = document.createElement('li');
//         listItem.textContent = url;
//         soft404List.appendChild(listItem);
//     }
// }

// // Call the function to update the soft 404 list on popup open
// updateSoft404List();

// Rest of your popup.js code for displaying other performance metrics


// Call the function on popup open
updatePopupContent();


