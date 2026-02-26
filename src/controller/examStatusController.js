const ExamStatus = require("../model/examStatus");
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");

// Create or update exam status by type
exports.createOrUpdateExamStatus = async (req, res) => {
    try {
        const staffId = req?.meta?._id;
        const { type, status } = req.body;

        if (!type) {
            return sendResponse(
                res,
                400,
                null,
                Messages.REQUIRED_FIELD("Type")
            );
        }

        if (!status) {
            return sendResponse(
                res,
                400,
                null,
                Messages.REQUIRED_FIELD("Status")
            );
        }

        const existing = await ExamStatus.findOne({ type });

        if (!existing) {
            await ExamStatus.create({
                type,
                status,
                createdBy: staffId || null,
            });
            return sendResponse(res, 200, null, Messages.DATA_CREATED);
        }

        existing.status = status;
        if (staffId) {
            existing.updatedBy = staffId;
        }
        await existing.save();

        return sendResponse(res, 200, null, Messages.DATA_UPDATE);
    } catch (error) {
        return sendResponse(res, 400, null, error.message);
    }
};

// Get all exam statuses
exports.getExamStatuses = async (req, res) => {
    try {
        const data = await ExamStatus.find()
            .populate({ path: "createdBy", select: "name" })
            .populate({ path: "updatedBy", select: "name" })
            .sort({ createdAt: -1 });

        return sendResponse(res, 200, data, Messages.DATA_FETCHED);
    } catch (error) {
        return sendResponse(res, 400, null, error.message);
    }
};

