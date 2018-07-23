// Replace with require('pikud-haoref-api') if the package resides in node_modules
var pikudHaoref = require('../index');

// Insert your Google Maps API key here for location geocoding
var options = {
    googleMapsApiKey: ''
};

// Fetch city metadata from Pikud Haoref's website
pikudHaoref.getCityMetadata(function (err, cities) {
    // Task failed?
    if (err) {
        return console.error(err);
    }

    // Success, output metadata to console
    console.log(JSON.stringify(cities));
}, options);