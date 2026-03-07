// Replace with require('pikud-haoref-api') if the package resides in node_modules
var pikudHaoref = require('../index');
var { HttpsProxyAgent } = require('https-proxy-agent');

// Set polling interval in millis
var interval = 5000;

// Define polling function
var poll = function() {
    // Optional Israeli proxy if running outside Israeli borders
    var options = {
        // httpsAgent: new HttpsProxyAgent('http://user:pass@hostname:port/')
    };

    // Get currently active alerts
    // Example response (array):
    // [{ 
    //    id: '134168709720000000',
    //    type: 'missiles', 
    //    cities: ['תל אביב - מזרח', 'חיפה - כרמל ועיר תחתית', 'עין גדי'],
    //    instructions: 'היכנסו למבנה, נעלו את הדלתות וסגרו את החלונות'
    // }]
    pikudHaoref.getActiveAlerts(function (err, alerts) {
        // Schedule polling in X millis
        setTimeout(poll, interval);

        // Log errors
        if (err) {
            return console.log('Retrieving active alerts failed: ', err);
        }

        // Alert header
        console.log('Currently active alerts:');

        // Log the alerts (if any)
        console.log(alerts);

        // Line break for readability
        console.log();
    }, options);
}

// Start polling for active alerts
poll();