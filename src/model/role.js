const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    roleName: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
        ref: 'Staff',
        default: null
    },
    updatedBy: {
        type: mongoose.Types.ObjectId,
        ref: 'Staff',
        default: null
    },
},
    {
        timestamps: true
    }
);
const Role = mongoose.model('Role', roleSchema);

module.exports = Role;