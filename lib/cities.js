var co = require('co');
var config = require('../config');
var request = require('co-request');
var archive = require('../citiesArchive.js');
var geolocation = require('../util/geolocation');
var timeIdentifiers = require('../metadata/timeIdentifiers');
var lifeshieldShelters = require('../metadata/lifeshieldShelters');

module.exports = function (callback, options) {
    // Fallback options param
    options = options || {};

    // Chrome user agent to avoid being blocked (strange 404 error)
    options.headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
    };

    // Make sure Google Maps API key passed in
    if (!options.googleMapsApiKey) {
        return callback(new Error(`Please provide a Google Maps API Key and try again.`));
    }

    // Magical ES6 generator wrapper
    co(function* () {
        try {
            // Fetch city lists in both Hebrew and English from Pikud Haoref's official website
            var citiesHeb = yield extractCitiesFromUrl(config.hfc.website.hebUrl, options, false);
            var citiesEng = yield extractCitiesFromUrl(config.hfc.website.engUrl, options, true);

            // Final cities metadata array
            var metadata = [{
                "name": "בחר הכל",
                "name_en": "Select All",
                "zone": "",
                "zone_en": "",
                "time": "all",
                "time_en": "",
                "countdown": 0,
                "lat": 0,
                "lng": 0,
                "value": "all"
              }];

            // Unique values object
            var values = {};

            // Loop over hebrew cities
            for (var cityId in citiesHeb) {
                // Fetch both cities by unique ID
                var cityHeb = citiesHeb[cityId];
                var cityEng = citiesEng[cityId];

                // Can't match cities by city ID?
                if (!cityEng) {
                    console.error(`Failed to find English locale for city ${cityHeb.name} (ID: ${cityId})`);
                    continue;
                }

                // Check for cached geolocation for this city (speed things up)
                for (var cityArchive of archive) {
                    if (cityArchive.name === cityHeb.name) {
                        if (cityArchive.lat && cityArchive.lng) {
                            cityHeb.lat = cityArchive.lat;
                            cityHeb.lng = cityArchive.lng;
                            cityEng.lat = cityArchive.lat;
                            cityEng.lng = cityArchive.lng;
                            break;
                        }
                    }
                }

                // If lat/lng not extracted from Pikud Haoref's website, geocode using Google Maps API
                if (!cityHeb.lat || !cityHeb.lng) {
                    // Fetch geolocation info from Google Maps
                    var location = yield geocodeCity(cityHeb, options);

                    // Geocoding failed?
                    if (location.lat == 0) {
                        // Attempt one more time with English city name
                        location = yield geocodeCity(cityEng, options);
                    }

                    // Match?
                    if (location.lat != 0) {
                        cityHeb.lat = location.lat;
                        cityHeb.lng = location.lng
                    }
                }

                // Get countdown object
                var countdown = timeIdentifiers[cityHeb.countdown];

                // Prepare finalized city object
                var city = {
                    name: cityHeb.name,
                    name_en: cityEng.name,
                    zone: cityHeb.zone,
                    zone_en: cityEng.zone,
                    time: countdown.time,
                    time_en: countdown.time_en,
                    countdown: countdown.countdown,
                    lat: cityHeb.lat,
                    lng: cityHeb.lng,
                    value: cityHeb.name
                };

                // Lifeshield shelter count exists for this city?
                if (lifeshieldShelters[cityHeb.name]) {
                    city.shelters = lifeshieldShelters[cityHeb.name];
                }

                // Ignore new HFC "All Areas" cities as they are too difficult to support
                if (city.name_en.includes('All Areas')) {
                    console.log('Ignoring "All areas" city: ' + city.value);
                    continue;
                }

                // Ensure no duplicate city entries
                if (values[city.value]) {
                    console.log('Duplicate city: ' + city.value);
                }
                else {
                    // First time encountering this city
                    metadata.push(city);

                    // Ensure no duplicate city entries
                    values[city.value] = 1;
                }
            }

            // Sort cities by name ASC
            metadata.sort(function (a, b) {
                // Order "Select All" element as first element
                if (a.value == 'all') {
                    return -1;
                }

                if (a.name < b.name)
                    return -1;
                if (a.name > b.name)
                    return 1;
                return 0;
            });

            // All done
            callback(null, metadata);
        }
        catch (err) {
            // Error
            callback(err);
        }
    });
}

function* extractCitiesFromUrl(url, options) {
    // Execute GET request
    var json = yield request(url, options);

    // Parse into JSON array
    var cities = JSON.parse(json.body);

    // Ensure JSON parse worked
    if (cities.length === 0) {
        throw new Error('Unable to parse JSON.');
    }

    // Final cities result array
    var citiesResult = {};

    // Traverse cities array from Pikud Haoref
    for (var city of cities) {
        // Empty city label?
        if (!city.label) {
            continue;
        }

        // Eliminate double spacing
        city.label = city.label.replace(/ {2}/g, ' ').trim();

        // Capitalize every English word in city name
        city.label = uppercaseWords(city.label);

        // Lowercase ' of '
        city.label = city.label.replace(' Of ', ' of ');

        // Remove duplicate single quote
        city.label = city.label.replace(/''/g, "'");

        // Extract zone
        var zoneMatch =  city.mixname.match(/<span>(.+?)<\/span>/i);

        // Ensure success
        if (!zoneMatch) {
            throw new Error("Failed to extract for city: " + city.label);
        }

        // Add city to result
        citiesResult[city.id] = {
            areaId: city.areaid,
            name: city.label,
            zone: zoneMatch[1],
            label: city.label,
            cityId: city.id,
            countdown: city.migun_time
        };
    }

    // Done with cities
    return citiesResult;
}

function uppercaseWords(str) {
    // Use regex for a more robusy solution
    return str.replace(/(^| )(\w)/g, function (x) {
        return x.toUpperCase();
    });
}

function* geocodeCity(city, options) {
    // Geocode city by name
    var json = yield request({ url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(city.name + ', Israel') + '&region=il&key=' + options.googleMapsApiKey, json: true });

    // Failed?
    if (json.body.status != 'OK' && json.body.status != 'ZERO_RESULTS') {
        // Output error
        throw new Error(`Geocoding error: ${json.body.status}`);
    }

    // Traverse results
    for (var result of json.body.results) {
        // Is result within Israel?
        if (isWithinIsraeliBorders(result.geometry.location)) {
            return result.geometry.location;
        }
        else {
            // Output error
            console.error(`Geocoding failed for ${city.name}, result is outside Israel`);
        }
    }

    // Output error
    console.error(`Geocoding failed for ${city.name}`);

    // Fallback coordinates
    return { lat: 0, lng: 0 };
}

function isWithinIsraeliBorders(location) {
    // Get distance of geocoded city from Israel's center in KM
    var distance = geolocation.getDistance(config.israel.center, location);

    // Within allowed radius?
    return distance <= config.israel.radius;
}