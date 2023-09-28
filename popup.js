function updatePopupContent() {
    // Send a message to the background script to get metrics
    chrome.runtime.sendMessage({action: 'getMetrics'}, function(metrics) {
        console.log("Fetched metrics from background:", metrics); // Log the fetched metrics

        document.getElementById('currentTime').textContent = metrics.currentTime || '-';
        document.getElementById('statusCode').textContent = metrics.statusCode || '-';
        // document.getElementById('dnsResponseCode').textContent = metrics.dnsResponseCode || '-';
        document.getElementById('pageLoadTime').textContent = metrics.pageLoadTime || '-';
        document.getElementById('ttfb').textContent = metrics.ttfb || '-';
        document.getElementById('errorType').textContent = metrics.errorType || '-';
        document.getElementById('errorDescription').textContent = metrics.errorDescription || '-';

        console.log('Set currentTime:', document.getElementById('currentTime').textContent);
    });
}

// Call the function on popup open
updatePopupContent();
