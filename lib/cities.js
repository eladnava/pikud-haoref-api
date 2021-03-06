var co = require('co');
var cheerio = require('cheerio');
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
            var metadata = [];

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

                // Attempt to fetch countdown info from Pikud Haoref
                var countdown = null;
                
                // Check for cached countdown for this city (speed things up)
                for (var cityArchive of archive) {
                    if (cityArchive.name === cityHeb.name) {
                        countdown = {
                            time: cityArchive.time, 
                            time_en: cityArchive.time_en,
                            countdown: cityArchive.countdown
                        }
                        break;
                    }
                }

                // Not found, query Pikud Haoref for it
                if (!countdown) {
                    console.log('Fetching countdown for ' + cityHeb.name);
                    countdown = yield fetchCountdown(cityHeb, options);
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

                // Dead Sea fail WTF LOL
                cityEng.zone = cityHeb.zone === 'דן' ? 'Dan' : cityEng.zone;

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

                // Special value for Tel Aviv due to multiple alert codes
                if (city.name == "תל אביב יפו") {
                    city.value = "תל אביב יפו (דן 156) (דן 157) (דן 158) (דן 159)";
                }

                // Lifeshield shelter count exists for this city?
                if (lifeshieldShelters[cityHeb.name]) {
                    city.shelters = lifeshieldShelters[cityHeb.name];
                }

                // Done with this city
                metadata.push(city);
            }

            // Sort cities by name ASC
            metadata.sort(function (a, b) {
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

function* extractCitiesFromUrl(url, options, isEnglish) {
    // Execute GET request
    var html = yield request(url, options);

    // Load HTML into Cheerio
    var $ = cheerio.load(html.body, { xmlMode: false });

    // Get all <script> tags in page
    var scripts = $('script');

    // No JS tag found?
    if (scripts.length === 0) {
        throw new Error('Unable to extract <script> tags. Body: ' + html.body);
    }
    
    // Fallback variables
    var cities = [], areas = [], districts = [];

    // Traverse scripts
    for (var i in scripts) {
        // Get current <script> tag
        var script = scripts[i];

        // Skip non-inline script elements
        if (!Array.isArray(script.children) || script.children.length === 0) {
            continue;
        }

        // Extract script JS code
        var snippet = script.children[0].data;
        
        // No JS tag found?
        if (!snippet) {
            throw new Error('Unable to extract areas and districts <script> tags. Body: ' + html.body);
        }

        // Does the code snippet contain the variable declarations we're looking for?
        if (snippet.includes('var cities ') || snippet.includes('var areas ') || snippet.includes('var districts')) {
            // Remove line breaks
            snippet = snippet.replace(/\r?\n/g, '');

            // Execute code (risky?)
            eval(snippet);
        }
    }

    // We should now have two variables defined: areas, cities
    if (cities.length === 0 || areas.length === 0 || districts.length === 0) {
        throw new Error('Unable to extract areas and districts JSON variables.');
    }

    // Convet areas into JS dictionary object
    var areasDictionary = getAreasDictionary(areas);

    // Final cities result array
    var citiesResult = {};

    // Traverse cities array from Pikud Haoref
    for (var city of districts) {
        // Empty city label?
        if (!city.label) {
            continue;
        }

        // Try to find area by area ID (city.value)
        var area = areasDictionary[city.areaid];

        // No such area with provided ID?
        if (!area) {
            console.error(`No area found for city ${city.label} (area ID: ${city.value})`);
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

        // Add city to result
        citiesResult[city.id] = {
            areaId: area.id,
            name: city.label,
            zone: area.label,
            label: city.label,
            cityId: city.value
        };

        // Try to find geolocation for this city
        if (!isEnglish) {
            // Traverse geolocation list and match by ID
            for (var geoCity of cities) {
                if (geoCity.id === city.value) {
                    // Bingo
                    citiesResult[city.id].lat = parseFloat(geoCity.lat);
                    citiesResult[city.id].lng = parseFloat(geoCity.lng);

                    // Use "cities" label instead of "districts" label (for fetching city countdown / zone info)
                    var label = geoCity.label;

                    // Eliminate double spacing
                    label = label.replace(/ {2}/g, ' ').trim();

                    // Capitalize every English word in city name
                    label = uppercaseWords(label);

                    // Lowercase ' of '
                    label = label.replace(' Of ', ' of ');

                    // Remove duplicate single quote
                    label = label.replace(/''/g, "'");

                    // Set label
                    citiesResult[city.id].label = label;

                    // Break
                    break;
                }
            }
        }
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

function getAreasDictionary(areas) {
    // Convert areas to dictionary
    var areasDictionary = {};

    // Traverse area objects
    for (var area of areas) {
        // Check for non-empty label and positive value
        if (!area.label || area.value === "0") continue;

        // Clean up area names
        area.label = area.label.replace(/\(.+?\)/g, '');
        area.label = area.label.replace(/ - [0-9]+.+/g, '');
        area.label = area.label.replace(/ - (דקה|One).*/g, '');
        area.label = area.label.replace('/^השפלה/', 'שפלה');
        area.label = area.label.replace(' - Lowlands', '');

        // Eliminate double spacing
        area.label = area.label.replace(/ {2}/g, ' ');

        // Capitalize every English word in area name
        area.label = uppercaseWords(area.label);

        // Trim leading/trailing spaces
        area.label = area.label.trim();

        // Store in dictionary
        areasDictionary[area.value] = { id: area.value, label: area.label };
    }

    // Done
    return areasDictionary;
}

function* fetchCountdown(city, options) {
    // Fetch shelter instructions by area ID
    var html = yield request('https://www.oref.org.il/Shared/Ajax/GetInstructionsByArea.aspx?lang=he&RiFid=1087&from=1&cityid=' + city.cityId + '&streetid=&ctlabel=' + escape(city.label) + '&stlabel=&house=&lat=00.00&lng=00.00&label=' + escape(city.label) + '&area=' + city.areaId + '&address=' + escape(city.label), options);

    // Load HTML into Cheerio
    var $ = cheerio.load(html.body);

    // Extract shelter time designation
    var countdownText = $('.timer span.bold').text().trim();

    // Some areas have no time designation
    if (!countdownText) {
        // Hard-code shfela instructions since Pikud Haoref returns empty instructions
        if (city.zone.includes('שפלה') || city.zone.includes('יהודה')) {
            return timeIdentifiers['דקה וחצי'];
        }

        // Hard-code lahish instructions since Pikud Haoref returns empty instructions
        if (city.zone.includes('לכיש') || city.zone === 'אשדוד 281') {
            return timeIdentifiers['45 שניות'];
        }

        // Hard-code negev instructions since Pikud Haoref returns empty instructions
        if (city.zone.includes('מרכז הנגב-עוטף')) {
            return timeIdentifiers['15 שניות'];
        }

        // Hard-code Tel Aviv instructions since Pikud Haoref returns empty instructions
        if (city.name.includes('תל אביב יפו')) {
            return timeIdentifiers['דקה וחצי'];
        }

        // Check for cached countdown for this zone (fallback)
        for (var cityArchive of archive) {
            if (cityArchive.zone === city.zone) {
                return {
                    time: cityArchive.time, 
                    time_en: cityArchive.time_en,
                    countdown: cityArchive.countdown
                }
            }
        }

        // Warn about missing instructions and default to 0 seconds
        console.error(`No time to shelter instuctions for city: ${city.name}, defaulting to 0 seconds`);
        return timeIdentifiers['מיידי'];
    }

    // Traverse designations
    for (var identifier in timeIdentifiers) {
        // Find match
        if (countdownText.includes(identifier)) {
            return timeIdentifiers[identifier];
        }
    }

    // Unfamiliar countdown time designation, default to 0 seconds
    console.error(`Unknown countdown designation '${countdownText}' for city: ${city.name}`);
    return timeIdentifiers["מיידי"];
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