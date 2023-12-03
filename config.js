module.exports = {
    hfc: {
        alerts: {
            // URL to Pikud Haoref's unofficial rocket alert JSON API
            api: 'https://www.oref.org.il/WarningMessages/alert/alerts.json'
        },
        // URLs to Pikud Haoref's official homepages in Hebrew and English which contain city metadata
        website: {
            // Main cities JSON URL
            citiesJson: 'https://www.oref.org.il/Shared/Ajax/GetCitiesMix.aspx?lang=he',
            // Additional language URLs
            translatedCitiesJson: {
                en: 'https://www.oref.org.il/Shared/Ajax/GetCitiesMix.aspx?lang=en',
                ru: 'https://www.oref.org.il/Shared/Ajax/GetCitiesMix.aspx?lang=ru',
                ar: 'https://www.oref.org.il/Shared/Ajax/GetCitiesMix.aspx?lang=ar'
            }
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