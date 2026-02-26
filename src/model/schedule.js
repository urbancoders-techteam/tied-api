const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true
        },
        fullName: {
            type: String,
            required: true
        },
        scheduleDate: {
            type: Date,
            required: true
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff',
            required: true
        },
        quries: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true
    }
)

const Schedule = mongoose.model('Schedule', scheduleSchema);
module.exports = Schedule;