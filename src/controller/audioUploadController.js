const mongoose = require('mongoose');
const { Messages } = require("../helper/message");
const { sendResponse } = require("../helper/response");
const { uploadAudioToS3 } = require("../helper/uploadToS3");

const uploadAudio = async (req, res) => {
    try {
        const { file } = req; // Assuming audio is sent as form-data under 'file'

        if (!file) {
            return res.status(400).json({ message: "No audio file provided" });
        }

        const audioUrl = await uploadAudioToS3(file); // Upload the audio file to S3

        res.status(200).json({ message: "Audio uploaded successfully", audioUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Audio upload failed", error: error.message });
    }
};

module.exports = { uploadAudio }