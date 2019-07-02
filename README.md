pikud-haoref-api
===================
[![npm version](https://badge.fury.io/js/pikud-haoref-api.svg)](https://www.npmjs.com/package/pikud-haoref-api)

A Node.js wrapper library for Pikud Haoref's unofficial rocket alert API. It allows you to easily query for the active rocket alert cities in Israel.

**Note:** This API is only accessible from within Israel. Either run the script on an Israeli machine, or use a proxy.

Usage
---

First, install the package using npm:
```shell
npm install pikud-haoref-api --save
```

Then, use the following code to poll for the currently-active rocket alert cities:

```js
var pikudHaoref = require('pikud-haoref-api');

// Set polling interval in millis
var interval = 5000;

// Define polling function
var poll = function () {
    // Optional Israeli proxy if running outside Israeli borders
    var options = {
        proxy: 'http://user:pass@hostname:port/'
    };

    // Get currently active rocket alert cities as an array
    // Example response: ["תל אביב - מזרח", "חיפה - כרמל ועיר תחתית", "עין גדי"]
    pikudHaoref.getActiveRocketAlertCities(function (err, alertCities) {
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
```

Requirements
---
* Node.js v4.2.x+ for ES6's `for-of` loop support

License
---
Apache 2.0
