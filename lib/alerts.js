var request = require('request');
var config = require('../config');

// Set time zone for date parsing
process.env.TZ = 'Asia/Jerusalem'

module.exports = function (callback, options) {
    // Execute HTTP request to HFC API and get current alert as a JS object
    getHFCAlertsJSON(options, function (err, json) {
        // JSON retrieval failed?
        if (err) {
            return callback(err);
        }

        // Extract alert from HFC's strange JSON structure
        extractAlertFromJSON(json, function (err, alert) {
            // Alert extraction failed?
            if (err) {
                return callback(err);
            }

            // Call the callback with current alert
            callback(null, alert);
        });
    });
}

function getHFCAlertsJSON(options, callback) {
    // Fallback request options
    options = options || {};

    // Prepare HFC API request options
    options.url = config.hfc.alerts.api;

    // Append unix timestamp to query string to avoid cached response
    options.url += '?' + Math.round(new Date().getTime() / 1000);

    // Set null encoding to handle decoding manually (request will return a buffer)
    options.encoding = null;

    // Set client-side headers
    options.headers = {
        'Referer': 'https://www.oref.org.il/11226-he/pakar.aspx',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
    };

    // Execute request
    request(options, function (err, res, buffer) {
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

function extractAlertFromJSON(json, callback) {
    // Initialize alert object
    var alert = { type: 'none', cities: [] };

    // No "data" array means there is no active alert
    if (!json.data) {
        return callback(null, alert);
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
        if (alert.cities.indexOf(city) == -1) {
            alert.cities.push(city);
        }
    }

    // Get alert type by category number
    alert.type = getAlertTypeByCategory(json.cat);

    // Pass on instructions in Hebrew if provided by HFC
    if (json.desc) {
        alert.instructions = json.desc;
    }

    // Return alert cities list
    return callback(null, alert);
}

function getAlertTypeByCategory(category) {
    // Fallback to standard missiles alert
    if (!category) {
        return 'missiles';
    }

    // Parse string to integer
    category = parseInt(category);

    // Return alert type by category number
    switch (category) {
        case 1:
            return 'missiles';
        case 2:
            return 'general';
        case 3:
            return 'earthQuake';
        case 4:
            return 'radiologicalEvent';
        case 5:
            return 'tsunami';
        case 6:
            return 'hostileAircraftIntrusion';
        case 7:
            return 'hazardousMaterials';
        case 13:
            return 'terroristInfiltration';
        case 101:
            return 'missilesDrill';
        case 102:
            return 'generalDrill';
        case 103:
            return 'earthQuakeDrill';
        case 104:
            return 'radiologicalEventDrill';
        case 105:
            return 'tsunamiDrill';
        case 106:
            return 'hostileAircraftIntrusionDrill';
        case 107:
            return 'hazardousMaterialsDrill';
        case 113:
            return 'terroristInfiltrationDrill';
        default:
            return 'unknown';
    }
}
