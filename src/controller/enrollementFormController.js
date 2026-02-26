const { sendResponse } = require("../helper/response");
const { Messages } = require("../helper/message");
const EnrollementForm = require('../model/enrollementForm.js');
const Staff = require('../model/staffModel.js')
const Student = require("../model/studentModel")

exports.addEnrollementForm = async (req, res) => {
    try {
        const id = req?.meta?._id;
        const { userId } = req.body;

        const initialId = userId ? userId : id;
        const filledBy = userId ? "admin" : "user";
        const newCourse = new EnrollementForm({ ...req.body, filledBy, userId: initialId });
        await newCourse.save();
        await Student.findByIdAndUpdate(initialId,
            {
                $set: {
                    isenrolled: true
                }
            }
        )
        sendResponse(res, 200, newCourse, Messages.DATA_CREATED);

    } catch (err) {
        res.status(400).send(err.message);
    }
}

exports.listEnrollementForm = async (req, res) => {
    try {
        const listEnrollementForm = await EnrollementForm.find();
        sendResponse(res, 200, listEnrollementForm, Messages.DATA_RETRIVED);

    } catch (err) {
        res.status(400).send(err.message);
    }
}

exports.getEnrollementForm = async (req, res) => {
    try {
        const { id } = req.params;
        const listEnrollementForm = await EnrollementForm.findById(id);
        sendResponse(res, 200, listEnrollementForm, Messages.DATA_RETRIVED);

    } catch (err) {
        res.status(400).send(err.message);
    }
}