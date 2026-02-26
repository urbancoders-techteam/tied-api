const jwt = require("jsonwebtoken");
const { sendResponse } = require("../helper/response");
const Staff = require("../model/staffModel");
const Student = require("../model/studentModel");
const { Messages } = require("../helper/message");
const secretKey = process.env.SECRET_KEY;
const tokenBlacklist = new Set();

exports.GenerateToken = (id) => {
  try {
    const token = jwt.sign({ id: id }, secretKey, { expiresIn: "12h" });
    return token;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.ValidateToken = async (req, res, next) => {
  try {
    let isStaff = false;
    let token = req.headers.authorization;

    if (token) {
      // ✅ Bearer hata do agar aa raha hai
      if (token.startsWith("Bearer ")) {
        token = token.slice(7); // "Bearer " ke baad ka string
      }

      if (tokenBlacklist.has(token)) {
        return sendResponse(res, 401, null, Messages.UNAUTHORIZED);
      }

      const decodedToken = jwt.verify(token, secretKey);

      let user = await Student.findById(decodedToken.id).select("_id name");
      if (!user) {
        user = await Staff.findById(decodedToken.id);
        isStaff = true;
      }

      if (!user) {
        return sendResponse(res, 401, null, Messages.UNAUTHORIZED);
      }

      req.meta = user;
      req.meta.isStaff = isStaff;
      return next();
    } else {
      // ✅ Allowed public APIs without token
      const allowedApis = [
        "/api/v1/student/schedule-meeting",
        "/api/v1/blogs/web",
        "/api/v1/event/web",
        "/api/v1/testimonial/web",
      ];
      const isAllowedApi = allowedApis.some((allowedApi) =>
        req.originalUrl.startsWith(allowedApi)
      );
      if (!isAllowedApi) {
        return sendResponse(res, 401, null, Messages.UNAUTHORIZED);
      }
      return next();
    }
  } catch (err) {
    console.log("ValidateToken Error:", err.message);
    return sendResponse(res, 401, null, err.message);
  }
};

exports.BlacklistToken = (token) => {
  tokenBlacklist.add(token);
};
