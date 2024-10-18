module.exports = {
    hfc: {
        alerts: {
            // URL to Pikud Haoref's unofficial rocket alert JSON API
            api: 'https://www.oref.org.il/warningMessages/alert/Alerts.json'
        },
        alertsHistory: {
            // Additional URL to Pikud Haoref's unofficial rocket alert history JSON API
            api: 'https://www.oref.org.il/warningMessages/alert/History/AlertsHistory.json'
        },
        // URLs to Pikud Haoref's JSON files which contain city metadata
        website: {
            // Main cities JSON URL
            citiesJson: 'https://alerts-history.oref.org.il/Shared/Ajax/GetDistricts.aspx?lang=he',
            cityNotesJson: 'https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmInstructions.aspx?lang=he&from=1&cityid=',
            // Additional language URLs
            translatedCitiesJson: {
                en: 'https://alerts-history.oref.org.il/Shared/Ajax/GetDistricts.aspx?lang=en',
                ru: 'https://alerts-history.oref.org.il/Shared/Ajax/GetDistricts.aspx?lang=ru',
                ar: 'https://alerts-history.oref.org.il/Shared/Ajax/GetDistricts.aspx?lang=ar'
            },
            // Main zone names JSON URLs
            translatedZonesJson: {
                he: 'https://www.oref.org.il/districts/cities_heb.json',
                en: 'https://www.oref.org.il/districts/cities_eng.json',
                ru: 'https://www.oref.org.il/districts/cities_rus.json',
                ar: 'https://www.oref.org.il/districts/cities_arb.json'
            },
            // HFC segements API JSON files (additional cities not present in GetDistricts.aspx)
            segmentsJson: 'https://dist-android.meser-hadash.org.il/smart-dist/services/anonymous/segments/android?locale=iw_IL&instance=1544803905',
            // Additional language URLs
            translatedSegmentsJson: {
                en: 'https://dist-android.meser-hadash.org.il/smart-dist/services/anonymous/segments/android?locale=en_US&instance=1544803905',
                ru: 'https://dist-android.meser-hadash.org.il/smart-dist/services/anonymous/segments/android?locale=ru_RU&instance=1544803905',
                ar: 'https://dist-android.meser-hadash.org.il/smart-dist/services/anonymous/segments/android?locale=ar_EG&instance=1544803905'
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