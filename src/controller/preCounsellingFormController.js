const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const PreCounsellingForm = require('../model/preCounsellingForm');
const Staff = require('../model/staffModel.js')
const Student = require("../model/studentModel")


exports.addForm = async (req, res) => {

    const { personalDetails } = req.body;
    const { email, mobileNumber } = personalDetails;
    try {
        const emailExists = await PreCounsellingForm.findOne({ 'personalDetails.email': email });
        const mobileExists = await PreCounsellingForm.findOne({ 'personalDetails.mobileNumber': mobileNumber });

        if (emailExists) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        if (mobileExists) {
            return res.status(400).json({ message: 'Mobile number already exists' });
        }

        const newForm = new PreCounsellingForm(req.body);
        const savedForm = await newForm.save();
        sendResponse(res, 200, savedForm, Messages.DATA_CREATED);
    } catch (error) {
        console.log(error);
        sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
    }
}

exports.listForm = async (req, res) => {
    try {
        const forms = await PreCounsellingForm.find();
        sendResponse(res, 200, forms, Messages.DATA_RETRIVED);
    } catch (err) {
        sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
    }
}

exports.getFormAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const checkStaff = await Staff.findById(req?.meta?._id);
        if (!checkStaff) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);

        const forms = await PreCounsellingForm.findOne(id);
        if (!forms) return sendResponse(res, 404, nul, Messages.DATA_NOT_FOUND)
        sendResponse(res, 200, forms, Messages.DATA_RETRIVED);
    } catch (err) {
        sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
    }
}

exports.getFormStudent = async (req, res) => {
    try {
        const checkStudent = await Student.findById(req?.meta?._id);
        if (!checkStudent) return sendResponse(res, 400, null, Messages.DATA_NOT_FOUND);
        const { id } = req.params;
        const forms = await PreCounsellingForm.findOne(id);
        if (!forms) return sendResponse(res, 404, nul, Messages.DATA_NOT_FOUND)
        sendResponse(res, 200, forms, Messages.DATA_RETRIVED);
    } catch (err) {
        sendResponse(res, 500, null, Messages.INTERNAL_ERROR);
    }
}