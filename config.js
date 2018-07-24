module.exports = {
    hfc: {
        alerts: {
            // URL to Pikud Haoref's unofficial rocket alert JSON API
            api: 'http://www.oref.org.il/WarningMessages/Alert/alerts.json?v=1'
        },
        // URLs to Pikud Haoref's official homepages in Hebrew and English which contain city metadata
        website: {
            hebUrl: 'http://www.oref.org.il/11093-he/Pakar.aspx',
            engUrl: 'http://www.oref.org.il/894-en/Pakar.aspx'
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