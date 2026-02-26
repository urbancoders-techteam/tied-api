function getFutureDateTime() {
  const currentDate = new Date();
  currentDate.setHours(currentDate.getHours() + 5);
  currentDate.setMinutes(currentDate.getMinutes() + 30);
  return currentDate;
}
//ANCHOR - get Current IST Time
function getCurrentISTTime() {
  // Get the current UTC time
  const utcDate = new Date();

  // Calculate IST time (UTC + 5 hours 30 minutes)
  const istOffset = 5.5 * 60;
  const istTime = new Date(utcDate.getTime() + istOffset * 60 * 1000);

  return istTime;
}

function isBase64(str) {
  return (
    typeof str === "string" &&
    /^data:(image|application)\/[a-zA-Z]+;base64,/.test(str)
  );
}

module.exports = {
  getFutureDateTime,
  isBase64,
  getCurrentISTTime,
};

