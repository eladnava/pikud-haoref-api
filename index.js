var request = require('request');
var config = require('./config');

exports.getActiveRocketAlertZones = function(callback) {
    // Execute HTTP request to HFC API and get current alerts as JS object
    getHFCAlertsJSON(function(err, json) {
        // JSON retrieval failed?
        if (err) {
            return callback(err);
        }

        // Extract alert zones from HFC's strange JSON structure
        extractAlertZonesFromJSON(json, function(err, alertZones) {
            // Alert extraction failed?
            if (err) {
                return callback(err);
            }

            // Call the callback with current rocket alert zones
            callback(null, alertZones);
        });
    });
}

function getHFCAlertsJSON(callback) {
    // Prepare HFC API request options
    var options = {
        url: config.hfc.alerts.api,
        encoding: null // Set null encoding to handle decoding manually (request will return a buffer)
    };

    // Execute request
    request(options, function(err, res, buffer) {
        // Request failed? 
        if (err) {
            return callback(new Error('Failed to retrieve alerts from HFC API: ' + err));
        }

        // Weird redirect?
        if (buffer.toString('utf8').indexOf('/errorpage_adom/') != -1) {
            return callback(new Error('The HFC API returned a temporary error page.'));
        }

        // Detect encoding (it varies between UTF-16-LE and UTF-8)
        var encoding = 'utf16le';

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
        }

        // Convert buffer to string using our detected encoding
        var body = buffer.toString(encoding);

        // Empty response means there are no active rocket alerts, return empty object
        if (body.trim() == '') {
            return callback(null, {});
        }

        // Prepare JSON object
        var json;

        try {
            // Try to parse the response body
            json = JSON.parse(body);
        }
        catch (err) {
            // Stop execution
            return callback(new Error('Failed to parse HFC JSON: ' + err));
        }

        // Call the callback with parsed JSON
        callback(null, json);
    });
}

function extractAlertZonesFromJSON(json, callback) {
    // Alert zones array
    var alertZones = [];

    // No "data" array means there are no active alerts
    if (!json.data) {
        return callback(null, alertZones);
    }

    // Traverse zones in "data" array
    for (var zones of json.data) {
        // Empty?
        if (!zones) {
            continue;
        }

        // Sometimes a data element is a CSV of multiple zones
        zones = zones.split(',');

        // Loop over zone(s)
        for (var zone of zones) {

            // Skip empty zone elements
            if (!zone) {
                continue;
            }

            // Skip Pikud Haoref's test alerts (they contain 'test' in Hebrew)
            if (zone.indexOf('בדיקה') != -1) {
                continue;
            }

            // Strip out Pikud Haoref's "מרחב" prefix from zone name
            zone = zone.replace('מרחב ', '').trim();

            // Add to alert zones (uniquely)
            if (alertZones.indexOf(zone) == -1) {
                alertZones.push(zone);
            }
        }
    }

    // Return alert zones list
    return callback(null, alertZones);
}