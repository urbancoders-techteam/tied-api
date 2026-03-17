const axios = require("axios");

/**
 * Required .env variables for EmailJS:
 * - EMAILJS_API_URL: API endpoint (e.g. https://api.emailjs.com/api/v1.0/email/send)
 * - EMAILJS_PUBLIC_KEY: Your EmailJS Public Key (user_id)
 * - EMAILJS_SERVICE_ID: Your EmailJS Service ID
 * - EMAILJS_TEMPLATE_ID: Default template ID (or EMAILJS_MEETING_TEMPLATE_ID for meeting emails)
 *
 * Get these from https://dashboard.emailjs.com/
 */

/**
 * Sends an email using EmailJS REST API
 * @param {Object} options - Email options
 * @param {string} options.serviceId - EmailJS Service ID (or use 'default_service')
 * @param {string} options.templateId - EmailJS Template ID
 * @param {Object} options.templateParams - Dynamic template parameters (e.g., { name: 'John', email: 'john@example.com' })
 * @param {string} [options.accessToken] - Optional private key for restricted templates
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
const sendEmail = async ({
  serviceId,
  templateId,
  templateParams = {},
  accessToken,
}) => {
  try {
    const apiUrl = process.env.EMAILJS_API_URL;
    const user_id = process.env.EMAILJS_PUBLIC_KEY;
    const service_id = serviceId || process.env.EMAILJS_SERVICE_ID;
    const template_id = templateId || process.env.EMAILJS_TEMPLATE_ID;

    if (!apiUrl || !user_id || !service_id || !template_id) {
      return {
        success: false,
        error: "EmailJS is not configured. Set EMAILJS_API_URL, EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, and EMAILJS_TEMPLATE_ID in .env",
      };
    }

    const payload = {
      service_id,
      template_id,
      user_id,
      template_params: templateParams,
    };

    if (accessToken) {
      payload.accessToken = accessToken;
    }

    const response = await axios.post(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    if (response.status === 200) {
      return { success: true, message: "Email sent successfully" };
    }

    return {
      success: false,
      error: response.data?.message || "Failed to send email",
    };
  } catch (error) {
    const errorMessage =
      error.response?.data ||
      error.message ||
      "Unknown error while sending email";
    return {
      success: false,
      error: typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage),
    };
  }
};

/**
 * Sends a meeting schedule confirmation email
 * @param {Object} params - Meeting details
 * @param {string} params.name - Contact name
 * @param {string} params.email - Contact email
 * @param {string} params.phone - Contact phone
 * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
 */
const sendMeetingScheduleEmail = async ({ name, email, phone }) => {
  return sendEmail({
    serviceId: process.env.EMAILJS_SERVICE_ID,
    templateId: process.env.EMAILJS_MEETING_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID,
    templateParams: {
      to_name: name,
      to_email: email,
      to_phone: phone,
      name,
      email,
      phone,
    },
  });
};

module.exports = {
  sendEmail,
  sendMeetingScheduleEmail,
};
