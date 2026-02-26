const jwt = require("jsonwebtoken");
const { sendResponse } = require("../helper/response");
const Staff = require("../model/staffModel")
const Student = require("../model/studentModel")
const { Message } = require("../helper/message");
const secretKey = process.env.SECRET_KEY;

exports.GenerateTokenMe = (id) =>
{
    try {
        const token = jwt.sign({ id: id }, secretKey, { expiresIn: '24h' });
        return token;
    } catch (err) {
        console.log(err);
        throw err;
    }
};

exports.ValidateToken = async (req, res, next) =>
{
    try {
        let isStaff = false;
        const token = req.headers.authorization;
        if (!token) return sendResponse(res, 401, null, Message.TOKEN_MISSING);
        const decodedToken = jwt.verify(token, secretKey);
        let user = await Student.findById(decodedToken.id).select(
            "_id name "
        );

        if (!user) {
            user = await Staff.findById(decodedToken.id)
           
            isStaff = true;

        }
        req.meta = user;
        req.meta.isStaff = isStaff;
        next();
    } catch (err) {
        console.log(err);
        sendResponse(res, 401, null, err.message);
    }
};
