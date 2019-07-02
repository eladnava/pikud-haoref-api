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

    // Get currently active rocket alert cities as an array
    // Example response: ["תל אביב - מזרח", "חיפה - כרמל ועיר תחתית", "עין גדי"]
    pikudHaoref.getActiveRocketAlertCities(function(err, alertCities) {
        // Schedule polling in X millis
        setTimeout(poll, interval);

        // Log errors
        if (err) {
            return console.log('Retrieving active rocket alert cities failed: ', err);
        }

        // Alert cities header
        console.log('Currently active rocket alert cities:');

        // Log the alert cities (if any)
        console.log(alertCities);

        // Line break for readability
        console.log();
    }, options);
}

// Start polling for active alert cities
poll();