const express = require("express");
const pikudHaoref = require("pikud-haoref-api");
const app = express();
const PORT = 3000;

let alertActive = false;
var poll = function () {
  pikudHaoref.getActiveAlert(function (err, alert) {
    if (err) {
      console.log("Retrieving active alert failed: ", err);
      return;
    }
    if (alert && alert.type && alert.type !== "none") {
      alertActive = true;
    } else {
      alertActive = false;
    }
  });
  setTimeout(poll, 5000); // Schedule polling in 5 seconds
};

poll(); // Start polling for active alert

app.get("/alertStatus", (req, res) => {
  if (alertActive) {
    res.send("ALERT");
    // Some code here
  } else {
    res.send("NO ALERT");
    // Some code here
  }
});

// Manual endpoints to control the alert status
app.get("/triggerAlert", (req, res) => {
  alertActive = true;
  res.send("Alert triggered");
});

app.get("/clearAlert", (req, res) => {
  alertActive = false;
  res.send("Alert cleared");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
