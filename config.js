module.exports = {
    hfc: {
        alerts: {
            // URL to Pikud Haoref's unofficial rocket alert JSON API
            api: 'https://www.oref.org.il/WarningMessages/alert/alerts.json'
        },
        // URLs to Pikud Haoref's official homepages in Hebrew and English which contain city metadata
        website: {
            hebUrl: 'https://www.oref.org.il/Shared/Ajax/GetCitiesMix.aspx?lang=he',
            engUrl: 'https://www.oref.org.il/Shared/Ajax/GetCitiesMix.aspx?lang=en'
        }
    },
    israel: {
        // Center of Israel coordinates
        center: {
            lat: 31.765352,
            lng: 34.988067
        },
        // This radius (in KM) should cover Israel from the center point to all borders
        radius: 400
    }
};