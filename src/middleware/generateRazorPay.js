const Razorpay = require("razorpay");

let razorpayInstance = null;

function getRazorpay() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error(
            "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file."
        );
    }
    if (!razorpayInstance) {
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
}

exports.generateRazorpayOrderId = async (amount) =>
{
    return new Promise(async (resolve, reject) =>
    {
        const options = {
            amount: amount * 100,
        };
        try {
            const razorpay = getRazorpay();
            const response = await razorpay.orders.create(options);
            resolve(response.id);
        } catch (error) {
            reject(error);
        }
    });
};