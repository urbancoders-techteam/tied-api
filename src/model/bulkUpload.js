const mongoose = require('mongoose');

const bulkSchema = new mongoose.Schema(
    {
        originalFile: {
            type: String,
            default: null
        },
        successFile: {
            type: String,
            default: null
        },
        errorFile: {
            type: String,
            default: null
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Staff'
        },
        createdAt: {
            type: String
        }
    })

const BulkUpload = mongoose.model('BulkUpload', bulkSchema);
module.exports = BulkUpload;