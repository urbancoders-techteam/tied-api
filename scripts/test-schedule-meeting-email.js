/**
 * Run this to test EmailJS meeting email (no DB required).
 * Usage: node scripts/test-schedule-meeting-email.js
 * Ensure .env has EMAILJS_API_URL, EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { sendMeetingScheduleEmail } = require("../src/services/emailService");

async function run() {
  console.log("Testing EmailJS sendMeetingScheduleEmail...\n");

  const result = await sendMeetingScheduleEmail({
    name: "Test User",
    email: "test@example.com",
    phone: "9876543210",
  });

  if (result.success) {
    console.log("OK – Email sent successfully.");
    console.log(result.message || "");
  } else {
    console.log("FAIL – Email failed:");
    console.log(result.error || "Unknown error");
  }
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
