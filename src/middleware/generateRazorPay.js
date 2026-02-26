const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.generateRazorpayOrderId = async (amount) =>
{
    return new Promise(async (resolve, reject) =>
    {
        const options = {
            amount: amount * 100,
        };
        try {
            const response = await razorpay.orders.create(options);
            resolve(response.id);
        } catch (error) {
            reject(error);
        }
    });
};