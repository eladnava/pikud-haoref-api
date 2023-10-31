var pikudHaoref = require("pikud-haoref-api");

// Set polling interval in millis
var interval = 5000;

// Define polling function
var poll = function () {
  // Optional Israeli proxy if running outside Israeli borders
  var options = {
    proxy: "http://user:pass@hostname:port/",
  };

  // Get currently active alert
  // Example response:
  // {
  //    type: 'missiles',
  //    cities: ['תל אביב - מזרח', 'חיפה - כרמל ועיר תחתית', 'עין גדי'],
  //    instructions: 'היכנסו למבנה, נעלו את הדלתות וסגרו את החלונות'
  // }
  pikudHaoref.getActiveAlert(function (err, alert) {
    // Schedule polling in X millis
    setTimeout(poll, interval);

    // Log errors
    if (err) {
      return console.log("Retrieving active alert failed: ", err);
    }

    // Alert header
    console.log("Currently active alert:");

    // Log the alert (if any)
    console.log(alert);

    // Line break for readability
    console.log();
  });
};

// Start polling for active alert
poll();
