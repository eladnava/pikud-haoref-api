pikud-haoref-api
===================
[![npm version](https://badge.fury.io/js/pikud-haoref-api.svg)](https://www.npmjs.com/package/pikud-haoref-api)

A Node.js wrapper library for Pikud Haoref's unofficial rocket alert API. It allows you to easily query for the active rocket alert zones in Israel.

**Note:** This API is only accessible from within Israel. Either run the script on an Israeli machine, or use a proxy.

Usage
---

First, install the package using npm:
```shell
npm install pikud-haoref-api --save
```

Then, use the following code to poll for the currently-active rocket alert zones:

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

    // Get currently active rocket alert zones as an array of zone codes
    // Example response: ["גולן 1", "חיפה 75", "שפלה 182"]
    pikudHaoref.getActiveRocketAlertZones(function (err, alertZones) {
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
```

Requirements
---
* Node.js v4.2.x+ for ES6's `for-of` loop support

License
---
Apache 2.0
