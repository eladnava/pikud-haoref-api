module.exports = {
    hfc: {
        alerts: {
            // URL to Pikud Haoref's unofficial rocket alert JSON API
            api: 'https://www.oref.org.il/WarningMessages/alert/alerts.json'
        },
        alertsHistory: {
            // Additional URL to Pikud Haoref's unofficial rocket alert history JSON API (when alerts.json returns an error)
            api: 'https://www.oref.org.il/WarningMessages/History/AlertsHistory.json'
        },
        // URLs to Pikud Haoref's official homepages in Hebrew and English which contain city metadata
        website: {
            hebUrl: 'https://www.oref.org.il/11093-he/Pakar.aspx',
            engUrl: 'https://www.oref.org.il/894-en/Pakar.aspx'
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