var cities = require('../citiesArchive');

// Zones dictionary
let zones = {
    "בחר הכל": {
        "name": "בחר הכל",
        "name_en": "Select All",
        "value": "all"
    }
};

// Traverse cities
for (var city of cities) {
    // If this is the first time encountering zone, add to list
    if (city.zone_en && !zones[city.zone_en]) {
        zones[city.zone_en] = { name: city.zone, name_en: city.zone_en, value: city.zone };
    }
}

// Convert to array
zones = Object.values(zones);

// Sort by alphabetic hebrew name
zones = zones.sort(function (a, b) {
    // Select All should override aphabetical sort
    if (a.value === 'all') {
        return -1;
    }

    // Sort by alphabetical Hebrew name
    return a.name.localeCompare(b.name);
});

// Print Android arrays.xml properties list
for (let zone of zones) {
    console.log('<item>' + zone.name + '</item>');
}

// Print Android arrays.xml properties list
for (let zone of zones) {
    console.log('<item>' + zone.name_en.replace("'", "\\'") + '</item>');
}

// Print iOS Zones.json
console.log(JSON.stringify(zones, null, 2));
