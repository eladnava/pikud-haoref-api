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
            // Fetch city list in Hebrew from Pikud Haoref's official website
            var cities = yield extractCitiesFromUrl(config.hfc.website.citiesJson, options);

            // City translations dictionary
            var cityTranslations = {};

            // Support for additional languages
            for (var lang in config.hfc.website.translatedCitiesJson) {
                // Fetch translated cities from Pikud Haoref's official website
                var translatedCities = yield extractCitiesFromUrl(config.hfc.website.translatedCitiesJson[lang], options);

                // Add to tranlations dictionary
                cityTranslations[lang] = translatedCities;
            }

            // Final cities metadata array
            // Add first entry for Android / iOS app select-all functionality
            var metadata = [{
                "name": "בחר הכל",
                "name_en": "Select All",
                "name_ru": "Выбрать все",
                "name_ar": "اختر الكل",
                "zone": "",
                "zone_en": "",
                "zone_ru": "",
                "zone_ar": "",
                "time": "all",
                "time_en": "",
                "time_ru": "",
                "time_ar": "",
                "countdown": 0,
                "lat": 0,
                "lng": 0,
                "value": "all"
            }];

            // Unique values object
            var values = {};

            // Loop over hebrew cities
            for (var cityId in cities) {
                // Fetch city by unique ID
                var city = cities[cityId];

                // Check for cached geolocation for this city (speed things up)
                for (var cityArchive of archive) {
                    if (cityArchive.name === city.name) {
                        if (cityArchive.lat && cityArchive.lng) {
                            city.lat = cityArchive.lat;
                            city.lng = cityArchive.lng;
                            break;
                        }
                    }
                }

                // If lat/lng not extracted from Pikud Haoref's website, geocode using Google Maps API
                if (!city.lat || !city.lng) {
                    // Fetch geolocation info from Google Maps
                    var location = yield geocodeCity(city, options);

                    // Match?
                    if (location.lat != 0) {
                        city.lat = location.lat;
                        city.lng = location.lng
                    }
                }

                // Get countdown object
                var countdown = timeIdentifiers[city.countdown];

                // Prepare city object with hebrew city name
                var result = {
                    name: city.name,
                };

                // Add translated city names
                for (let lang in cityTranslations) {
                    // Add translated zone
                    result['name_' + lang] = cityTranslations[lang][cityId].name;
                }

                // Add hebrew zone name
                result.zone = city.zone;

                // Add translated zone names
                for (let lang in cityTranslations) {
                    result['zone_' + lang] = cityTranslations[lang][cityId].zone;
                }

                // Add hebrew countdown time
                result.time = countdown.time;

                // Add translated countdown time
                for (let lang in cityTranslations) {
                    result['time_' + lang] = countdown['time_' + lang];
                }

                // Add the rest of city params
                result.countdown = countdown.countdown;
                result.lat = city.lat;
                result.lng = city.lng;
                result.value = city.name;

                // Lifeshield shelter count exists for this city?
                if (lifeshieldShelters[city.name]) {
                    result.shelters = lifeshieldShelters[city.name];
                }

                // Ignore new HFC "All Areas" cities as they are too difficult to support
                if (result.name_en.includes('All Areas')) {
                    console.log('Ignoring "All areas" city: ' + result.value);
                    continue;
                }

                // Ensure no duplicate city entries
                if (values[result.value]) {
                    console.log('Duplicate city: ' + result.value);
                }
                else {
                    // First time encountering this city
                    metadata.push(result);

                    // Ensure no duplicate city entries
                    values[result.value] = 1;
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
        var zoneMatch = city.mixname.match(/<span>(.+?)<\/span>/i);

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