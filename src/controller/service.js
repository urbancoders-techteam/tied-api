const Plan = require("../model/plan");

//Get plans by type by passing value
async function planByType(type) {
    try {
        if (!type) {
            throw new Error('Type is required');
        }
        const regex = new RegExp(`^${type}`, 'i');
        const ids = await Plan.find({ title: regex }).select('_id')
        return ids;
    } catch (error) {
        console.log(error)
        throw error;
    }
}

//Calculate the skip and parsedLimit
function calculateSkipAndLimit(page, limit) {
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    const skip = (parsedPage - 1) * parsedLimit;

    return {
        skip,
        parsedLimit
    };
}

//For console
function print(data) {
    return console.log(data);
}
module.exports = {
    planByType,
    calculateSkipAndLimit,
    print
}