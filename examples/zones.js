var cities = require('../citiesArchive');

// Zones dictionary
let zones = {};

// Traverse cities
for (var city of cities) {
    // If this is the first time encountering zone, add to list
    if (city.zone_en && !zones[city.zone_en]) {
        zones[city.zone_en] = { zone: city.zone, zone_en: city.zone_en };
    }
}

// Convert to array
zones = Object.values(zones);

// Sort by alphabetic hebrew name
zones = zones.sort(function (a, b) {
    return a.zone.localeCompare(b.zone);
});

// Select All option
console.log('<item>בחר הכל</item>');

// Print Android arrays.xml properties list
for (let zone of zones) {
    console.log('<item>' + zone.zone + '</item>');
}

// Select All option
console.log('<item>Select All</item>');

// Print Android arrays.xml properties list
for (let zone of zones) {
    console.log('<item>' + zone.zone_en.replace("'", "\\'") + '</item>');
}