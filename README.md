pikud-haoref-api
===================
[![npm version](https://badge.fury.io/js/pikud-haoref-api.svg)](https://www.npmjs.com/package/pikud-haoref-api)

A Node.js wrapper library for Pikud Haoref's unofficial alerts API. It allows you to easily query for the currently active alerts in Israel.

**Note:** This API is only accessible from within Israel. Either run the script on an Israeli machine, or use a proxy.

Usage
---

First, install the package using npm:
```shell
npm install pikud-haoref-api --save
```

Then, use the following code to poll for the currently-active alert:

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

    // Get currently active alert
    // Example response:
    // { 
    //    type: 'missiles', 
    //    cities: ['תל אביב - מזרח', 'חיפה - כרמל ועיר תחתית', 'עין גדי'],
    //    instructions: 'היכנסו למבנה, נעלו את הדלתות וסגרו את החלונות'
    // }
    pikudHaoref.getActiveAlert(function (err, alert) {
        // Schedule polling in X millis
        setTimeout(poll, interval);
        
        // Log errors
        if (err) {
            return console.log('Retrieving active alert failed: ', err);
        }

        // Alert header
        console.log('Currently active alert:');

        // Log the alert (if any)
        console.log(alert);

        // Line break for readability
        console.log();
    }, options);
}

// Start polling for active alert
poll();
```

Sample Alert Objects
---
When there is a missle alert:
```
{ 
    type: 'missiles', 
    cities: ['תל אביב - מזרח', 'חיפה - כרמל ועיר תחתית', 'עין גדי'],
    instructions: 'היכנסו למבנה, נעלו את הדלתות וסגרו את החלונות'
}
```
When there is no active alert:
```
{ 
    type: 'none', 
    cities: [] 
}
```

Alert Types
---

Added in version `3.0.0`:

* `none`
* `missiles`
* `radiologicalEvent`
* `earthQuake`
* `tsunami`
* `hostileAircraftIntrusion`
* `hazardousMaterials`
* `terroristInfiltration`
* `missilesDrill`
* `earthQuakeDrill`
* `radiologicalEventDrill`
* `tsunamiDrill`
* `hostileAircraftIntrusionDrill`
* `hazardousMaterialsDrill`
* `terroristInfiltrationDrill`
* `unknown`

Requirements
---
* Node.js v4.2.x+ for ES6's `for-of` loop support

License
---
Apache 2.0
