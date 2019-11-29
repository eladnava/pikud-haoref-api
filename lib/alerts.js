var request = require('request');
var config = require('../config');

// Set time zone for date parsing
process.env.TZ = 'Asia/Jerusalem'

module.exports = function(callback, options) {
    // Execute HTTP request to HFC API and get current alerts as JS object
    getHFCAlertsJSON(options, function(err, json) {
        // JSON retrieval failed?
        if (err) {
            return callback(err);
        }

        // Extract alert cities from HFC's strange JSON structure
        extractAlertCitiesFromJSON(json, function(err, alertCities) {
            // Alert extraction failed?
            if (err) {
                return callback(err);
            }

            // Call the callback with current rocket alert cities
            callback(null, alertCities);
        });
    });
}

function getHFCAlertsJSON(options, callback) {
    // Fallback request options
    options = options || {};

    // Prepare HFC API request options
    options.url = options.alertsHistoryJson ? config.hfc.alertsHistory.api : config.hfc.alerts.api;

    // Set null encoding to handle decoding manually (request will return a buffer)
    options.encoding = null;

    // Set client-side headers
    options.headers = {
        'Referer': 'https://www.oref.org.il/11226-he/pakar.aspx',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
    };

    // Execute request
    request(options, function(err, res, buffer) {
        // Request failed? 
        if (err) {
            return callback(new Error('Failed to retrieve alerts from HFC API: ' + err));
        }

        // Request failed? 
        if (res.statusCode != 200) {
            return callback(new Error('Failed to retrieve alerts from HFC API: ' + res.statusCode + ' ' + res.statusMessage));
        }

        // Weird redirect?
        if (buffer.toString('utf8').indexOf('/errorpage_adom/') != -1) {
            return callback(new Error('The HFC API returned a temporary error page.'));
        }

        // Detect encoding (it varies between UTF-16-LE and UTF-8)
        var encoding = 'utf8';

        // Determine encoding
        if (buffer.length > 1) {
            // Check for UTF16-LE BOM
            if (buffer[0] == 255 && buffer[1] == 254) {
                // Set encoding to UTF-16-LE
                encoding = 'utf16le';

                // Remove BOM from buffer
                buffer = buffer.slice(2);
            }

            // Check for UTF8 BOM
            else if (buffer.length > 2 && buffer[0] == 239 && buffer[1] == 187 && buffer[2] == 191) {
                // Set encoding to UTF-8
                encoding = 'utf8';

                // Remove BOM from buffer
                buffer = buffer.slice(3);
            }
            else {
                // No/unknown BOM, fallback to utf8
            }
        }

        // Convert buffer to string using our detected encoding
        var body = buffer.toString(encoding);

        // Empty response means there are no active rocket alerts, return empty object
        if (body.trim() == '') {
            return callback(null, {});
        }

        // Attempt to remove weird unicode character which may have snuck its way inside
        body = body.replace(/\u0A7B/g, '');
        
        // Prepare JSON object
        var json;

        try {
            // Try to parse the response body
            json = JSON.parse(body);
        }
        catch (err) {
            // Stop execution
            return callback(new Error('Failed to parse HFC JSON: ' + err + ', body:' + body));
        }

        // Call the callback with parsed JSON
        callback(null, json);
    });
}

function extractAlertCitiesFromJSON(json, callback) {
    // If it's an array, it must be AlertsHistory.json
    if (Array.isArray(json)) {
        return extractAlertCitiesFromHistoryJSON(json, callback);
    }

    // Alert cities array
    var alertCities = [];

    // No "data" array means there are no active alerts
    if (!json.data) {
        return callback(null, alertCities);
    }

    // Traverse cities in "data" array
    for (var city of json.data) {
        // Empty?
        if (!city) {
            continue;
        }

        // Trim (just in case)
        city = city.trim();

        // Skip Pikud Haoref's test alerts (they contain 'test' in Hebrew)
        if (city.indexOf('בדיקה') != -1) {
            continue;
        }

        // Add to alert cities (uniquely)
        if (alertCities.indexOf(city) == -1) {
            alertCities.push(city);
        }
    }

    // Return alert cities list
    return callback(null, alertCities);
}

function extractAlertCitiesFromHistoryJSON(json, callback) {
    // Alert cities array
    var alertCities = [];

    // Empty array means there are no historical/active alerts
    if (json.length === 0) {
        return callback(null, alertCities);
    }
    
    // Current unix timestamp
    var now = Math.round(new Date().getTime()/1000);

    // Traverse objects in array
    for (var alert of json) {
        // No date or city?
        if (!alert.alertDate || !alert.data) {
            continue;
        }

        // Convert date to unix (IL timezone)
        var unix = new Date(alert.alertDate).getTime() / 1000;

        // If more than 60 seconds passed, skip
        if (now - unix > 60) {
            continue;
        }

        // Trim alert city (just in case)
        var area = alert.data.trim();

        // Skip Pikud Haoref's test alerts (they contain 'test' in Hebrew)
        if (area.indexOf('בדיקה') != -1) {
            continue;
        }

        // Add to alert cities (uniquely)
        if (alertCities.indexOf(area) == -1) {
            alertCities.push(area);
        }
    }

    // Return alert cities list
    return callback(null, alertCities);
}