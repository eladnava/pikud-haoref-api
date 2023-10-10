import type { coords } from "../types";

// Copyright
// @mattpowell (https://gist.github.com/mattpowell/3380070)

if (!('toRad' in Number.prototype))
	Object.defineProperty(Number.prototype, "toRad", {
        value: function () { return this * Math.PI / 180 },
        enumerable: false
    });

declare global {
    interface Number {
        toRad(): number;
    }
}

// Returns distance between two points in kilometers
export function getDistance (start: coords, end: coords, decimals=2) {
    const earthRadius = 6371; // km

    const lat1 = (typeof start.lat == "number" ? start.lat : parseFloat(start.lat));
    const lat2 = (typeof end.lat == "number" ? end.lat : parseFloat(end.lat));
    const lon1 = (typeof start.lng == "number" ? start.lng : parseFloat(start.lng));
    const lon2 = (typeof end.lng == "number" ? end.lng : parseFloat(end.lng));

    const dLat = (lat2 - lat1).toRad();
    const dLon = (lon2 - lon1).toRad();

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1.toRad()) * Math.cos(lat2.toRad());
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = earthRadius * c;
    
    return Math.round(d * Math.pow(10, decimals)) / Math.pow(10, decimals);
};