import { writeFileSync } from "fs";

// Replace with require('pikud-haoref-api') if the package resides in node_modules
import { getCityMetadata } from "../index";

// Pikud Haoref Google Maps API Key
var options = {
  googleMapsApiKey: "AIzaSyCSeMZ5AxUgSWHy6EedcgeXjRC2irszdUQ",
};

// Fetch city metadata from Pikud Haoref's website
getCityMetadata(function (err, cities) {
  // Task failed?
  if (err) {
    return console.error(err);
  }

  // Write cities.json file to disc
  writeFileSync("cities.json", JSON.stringify(cities, null, 2), "utf8");

  // Output success
  console.log("Wrote cities.json successfully");
}, options);
