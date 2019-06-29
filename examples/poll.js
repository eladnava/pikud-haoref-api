// Replace with require('pikud-haoref-api') if the package resides in node_modules
var pikudHaoref = require('../index');

// Set polling interval in millis
var interval = 5000;

// Define polling function
var poll = function() {
    // Optional Israeli proxy if running outside Israeli borders
    var options = {
        proxy: 'http://user:pass@hostname:port/'
    };

    // Get currently active rocket alert zones as an array of zone codes
    // Example response: ["גולן 1", "חיפה 75", "שפלה 182"]
    pikudHaoref.getActiveRocketAlertZones(function(err, alertZones) {
        // Schedule polling in X millis
        setTimeout(poll, interval);

        // Log errors
        if (err) {
            return console.log('Retrieving active rocket alert zones failed: ', err);
        }

        // Alert zones header
        console.log('Currently active rocket alert zones:');

        // Log the alert zones (if any)
        console.log(alertZones);

        // Line break for readability
        console.log();
    }, options);
}

// Start polling for active alert zones
poll();