import config from "../config.json"
import baseCategoryMap from "../metadata/categoryMap.json"
import { alertType } from "../types";

// Set time zone for date parsing
process.env.TZ = 'Asia/Jerusalem'

export default async function () {
    // Execute HTTP request to HFC API and get current alert as a JS object
    const json = await getHFCAlertsJSON();
    const alerts = extractAlertFromJSON(json);

    return alerts;
}

async function getHFCAlertsJSON() {
    let url = config.hfc.alerts.api;

    // Append unix timestamp to query string to avoid cached response
    url += '?' + Math.round(new Date().getTime() / 1000);

    try {
        const alertReq = await fetch(url, { headers: new Headers({
            'Referer': 'https://www.oref.org.il/11226-he/pakar.aspx',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36'
        })});
    
        const body = await alertReq.text();
        if (body.includes('/errorpage_adom/')) {
            throw new Error('The HFC API returned a temporary error page.');
        }

        if (body.trim() == '') {
            return {}
        }

        try {
            return JSON.parse(body);
        } catch (err) {
            // Stop execution
            throw new Error('Failed to parse HFC JSON: ' + err + ', body:' + body);
        }
    } catch (e) {
        console.error('ERROR in the getHFCAlertJSON() function');
        throw e;
    }
}

function extractAlertFromJSON(obj:{cat:string; desc: string; data: string[]}) {
    // Initialize alert object
    const alert:{
        type: alertType
        cities: string[]
        instructions?: string
    } = { type: 'none', cities: [] };

    // No "data" array means there is no active alert
    if (!('data' in obj)) {
        return alert;
    }

    // Traverse cities in "data" array
    for (var city of obj.data) {
        // Empty?
        if (!city) {
            continue;
        }

        // Trim (just in case)
        city = city.trim();

        // Skip Pikud Haoref's test alerts (they contain 'test' in Hebrew)
        if (city.includes('בדיקה')) {
            continue;
        }

        // Add to alert cities (uniquely)
        if (alert.cities.indexOf(city) == -1) {
            alert.cities.push(city);
        }
    }

    // Get alert type by category number
    alert.type = getAlertTypeByCategory(obj.cat);

    // Pass on instructions in Hebrew if provided by HFC
    if (obj.desc) {
        alert.instructions = obj.desc;
    }

    return alert;
}

function getAlertTypeByCategory(category?: string) {
    // Fallback to standard missiles alert
    if (!category) {
        return 'missiles';
    }

    const categoryMap:Record<string, string> = {...baseCategoryMap}

    for (const key of Object.keys(categoryMap))
        categoryMap[100 + parseInt(key)] = categoryMap[parseInt(key)] + "Drill";

    return (category in categoryMap ? categoryMap[category] : 'unknown') as alertType
}