exports.addTimeToTimestamp = async (timestamp) =>
{
    let date = new Date(timestamp);
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    let year = date.getUTCFullYear();
    let month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
    let day = ("0" + date.getUTCDate()).slice(-2);
    let hours = ("0" + date.getUTCHours()).slice(-2);
    let minutes = ("0" + date.getUTCMinutes()).slice(-2);
    let seconds = ("0" + date.getUTCSeconds()).slice(-2);
    let milliseconds = ("00" + date.getUTCMilliseconds()).slice(-3);
    let result = `${ year }-${ month }-${ day }T${ hours }:${ minutes }:${ seconds }.${ milliseconds }Z`;
    return result;
};
