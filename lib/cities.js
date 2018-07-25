var co = require('co');
var cheerio = require('cheerio');
var config = require('../config');
var request = require('co-request');
var geolocation = require('../util/geolocation');
var timeIdentifiers = require('../metadata/timeIdentifiers');
var lifeshieldShelters = require('../metadata/lifeshieldShelters');

module.exports = function (callback, options) {
    // Fallback options param
    options = options || {};

    // Make sure Google Maps API key passed in
    if (!options.googleMapsApiKey) {
        return callback(new Error(`Please provide a Google Maps API Key and try again.`));
    }

    // Magical ES6 generator wrapper
    co(function* () {
        try {
            // Fetch city lists in both Hebrew and English from Pikud Haoref's official website
            var citiesHeb = yield extractCitiesFromUrl(config.hfc.website.hebUrl, false);
            var citiesEng = yield extractCitiesFromUrl(config.hfc.website.engUrl, true);

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
                var countdown = yield fetchCountdown(cityHeb, metadata);

                // Fetch geolocation info from Google Maps
                var location = yield geocodeCity(cityHeb, options);

                // Geocoding failed?
                if (location.lat == 0) {
                    // Attempt one more time with English city name
                    location = yield geocodeCity(cityEng, options);
                }

                // Prepare finalized city object
                var city = {
                    name: cityHeb.name,
                    name_en: cityEng.name,
                    zone: cityHeb.zone,
                    zone_en: cityEng.zone,
                    codes: cityHeb.codes,
                    region: cityHeb.region,
                    region_en: cityEng.region,
                    time: countdown.time,
                    time_en: countdown.time_en,
                    countdown: countdown.seconds,
                    lat: location.lat,
                    lng: location.lng,
                    value: `${cityHeb.name} (${cityHeb.zone})`
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

function* extractCitiesFromUrl(url, isEnglish) {
    // Execute GET request
    var html = yield request(url);

    // Load HTML into Cheerio
    var $ = cheerio.load(html.body, { xmlMode: false });

    // Get all <script> tags in page
    var scripts = $('script');

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

        // Does the code snippet contain the variable declarations we're looking for?
        if (snippet.includes('var cities') || snippet.includes('var areas')) {
            // Execute code (risky?)
            eval(snippet);
        }
    }

    // We should now have two variables defined: areas, cities
    if (!areas || !cities) {
        return callback('Unable to extract areas and cities JSON variables.');
    }

    // Convet areas into JS dictionary object
    var areasDictionary = yield getAreasDictionary(areas);

    // Final cities result array
    var citiesResult = {};

    // Traverse cities array from Pikud Haoref
    for (var city of cities) {
        // Empty city label?
        if (!city.label) {
            continue;
        }

        // Try to find area by area ID (city.value)
        var area = areasDictionary[city.value];

        // Hard-code area for Tel Aviv since it's a special case with multiple zone codes
        if (city.id == 811) {
            area = {
                id: 0,
                label: isEnglish ? "Dan 156, 157, 158, 159" : 'דן 156, 157, 158, 159',
                codes: [
                    156,
                    157,
                    158,
                    159
                ],
                region: isEnglish ? "Dan" : 'דן'
            }
        }

        // No such area with provided ID?
        if (!area) {
            console.error(`No area found for city ${city.label} (area ID: ${city.value})`);
            continue;
        }

        // Eliminate double spacing
        city.label = city.label.replace(/  /g, ' ').trim();

        // Capitalize every English word in city name
        city.label = city.label.replace(/\b\w/g, l => l.toUpperCase());

        // Extract area code & area region name
        var codes = area.codes || [getAreaCode(area.label)];
        var region = area.region || getAreaRegion(area.label);

        // Add city to result
        citiesResult[city.id] = {
            areaId: area.id,
            name: city.label,
            zone: area.label,
            codes: codes,
            region: region
        };
    }

    // Done with cities
    return citiesResult;
}

function getAreaCode(area) {
    // Extract numeric portion of area
    return parseInt(area.match(/([0-9]+)/)[0]);
}

function getAreaRegion(area) {
    // Extract non-numeric portion of area
    return area.replace(getAreaCode(area), '').trim();
}

function* getAreasDictionary(areas) {
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
        area.label = area.label.replace(/  /g, ' ');

        // Capitalize every English word in area name
        area.label = area.label.replace(/\b\w/g, l => l.toUpperCase());

        // Trim leading/trailing spaces
        area.label = area.label.trim();

        // Require area code
        if (!area.label.match(/([0-9]+)/)) {
            console.log(`Skipping invalid area: ${area.label}`);
            continue;
        }

        // Store in dictionary
        areasDictionary[area.value] = { id: area.value, label: area.label };
    }

    // Done
    return areasDictionary;
}

function* fetchCountdown(city, cities) {
    // Fetch shelter instructions by area ID
    var html = yield request('http://www.oref.org.il/Shared/Ajax/GetInstructionsByArea.aspx?lang=he&area=' + city.areaId);

    // Load HTML into Cheerio
    var $ = cheerio.load(html.body);

    // Extract shelter time designation
    var countdownText = $('.timer span.bold').text().trim();

    // Some areas have no time designation
    if (!countdownText) {
        // Hard-code shfela instructions since Pikud Haoref returns empty instructions
        if (city.region.includes('שפלה') || city.region.includes('יהודה')) {
            return timeIdentifiers['דקה וחצי'];
        }

        // Hard-code lahish instructions since Pikud Haoref returns empty instructions
        if (city.region.includes('לכיש') || city.zone === 'אשדוד 281') {
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