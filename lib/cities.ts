import config from '../config.json'
import { citiesResponse, cityExtendedObj, cityObj, coords, finalCityObj } from '../types';

import timeIdentifiers from '../metadata/timeIdentifiers.json'
import lifeshieldShelters from '../metadata/lifeshieldShelters.json'
import archive from "../citiesArchive.json"
import { getDistance } from "../util/geolocation"

type citiesFunctionParams = Parameters<typeof fetch>[1] & {googleMapsApiKey: string}

export default async function (options:citiesFunctionParams) {
    // Chrome user agent to avoid being blocked (strange 404 error)
    options.headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
    };

    // Make sure Google Maps API key passed in
    if (!('googleMapsApiKey' in options)) {
        throw new Error(`Please provide a Google Maps API Key and try again.`);
    }

    // Fetch city lists in both Hebrew and English from Pikud Haoref's official website
    const citiesHeb = await extractCitiesFromUrl(config.hfc.website.hebUrl, options);
    const citiesEng = await extractCitiesFromUrl(config.hfc.website.engUrl, options);

    // Final cities metadata array
    var metadata = [];

    // Unique values object
    const values:string[] = [];

    // Loop over hebrew cities
    for (var cityId in citiesHeb) {
        // Fetch both cities by unique ID
        var cityHeb = citiesHeb[cityId] as cityExtendedObj;
        var cityEng = citiesEng[cityId] as cityExtendedObj;

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
        if (!('lat' in cityHeb) || !('lng' in cityHeb)) {
            // Fetch geolocation info from Google Maps
            let location = await geocodeCity(cityHeb, options);

            // Geocoding failed?
            if (location.lat == 0) {
                // Attempt one more time with English city name
                location = await geocodeCity(cityEng, options);
            }

            // Match?
            if (location.lat != 0) {
                cityHeb.lat = location.lat;
                cityHeb.lng = location.lng
            }
        }

        // Get countdown object
        const countdown = timeIdentifiers[cityHeb.countdown.toString() as keyof typeof timeIdentifiers];

        // Prepare finalized city object
        let city: finalCityObj = {
            name: cityHeb.name,
            name_en: cityEng.name,
            zone: cityHeb.zone,
            zone_en: cityEng.zone,
            time: countdown.time,
            time_en: countdown.time_en,
            countdown: countdown.countdown,
            lat: cityHeb.lat,
            lng: cityHeb.lng
        };

        // Lifeshield shelter count exists for this city?
        if (cityHeb.name in lifeshieldShelters) {
            city.shelters = lifeshieldShelters[cityHeb.name as keyof typeof lifeshieldShelters];
        }

        // Ensure no duplicate city entries
        if (values.includes(city.name)) {
            console.log('Duplicate city: ' + city.name);
        }
        else {
            // First time encountering this city
            metadata.push(city);

            // Ensure no duplicate city entries
            values.push(city.name);
        }
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
    return metadata;
}

async function extractCitiesFromUrl(url:string, options:citiesFunctionParams) {
    // Execute GET request
    const cityRequest = await fetch(url, options);

    // Parse into JSON array
    const cities = await cityRequest.json() as citiesResponse[];

    // Ensure JSON parse worked
    if (cities.length === 0) {
        throw new Error('Unable to parse JSON.');
    }

    // Final cities result array
    const citiesResult:Record<citiesResponse["id"], cityObj> = {};

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
            cityId: city.id,
            countdown: city.migun_time
        };
    }

    // Done with cities
    return citiesResult;
}

function uppercaseWords(str:string) {
    // Use regex for a more robusy solution
    return str.replace(/(^| )(\w)/g, function (x) {
        return x.toUpperCase();
    });
}

async function geocodeCity(city:cityObj, options: citiesFunctionParams) {
    // Geocode city by name
    const geoData = await fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(city.name + ', Israel') + '&region=il&key=' + options.googleMapsApiKey);
    const json = await geoData.json();

    // Failed?
    if (json.status != 'OK' && json.status != 'ZERO_RESULTS') {
        // Output error
        throw new Error(`Geocoding error: ${json.status}`);
    }

    // Traverse results
    for (var result of json.results) {
        // Is result within Israel?
        if (isWithinIsraeliBorders(result.geometry.location)) {
            return result.geometry.location as { lat: number; lng: number; };
        } else {
            // Output error
            console.error(`Geocoding failed for ${city.name}, result is outside Israel`);
        }
    }

    // Output error
    console.error(`Geocoding failed for ${city.name}`);

    // Fallback coordinates
    return { lat: 0, lng: 0 };
}

function isWithinIsraeliBorders(location: coords) {
    // Get distance of geocoded city from Israel's center in KM
    var distance = getDistance(config.israel.center, location);

    // Within allowed radius?
    return distance <= config.israel.radius;
}