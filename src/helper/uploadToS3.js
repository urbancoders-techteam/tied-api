const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.KEY_SECRET,
  region: process.env.REGION,
});
// Upload API
function uploadToS3(base64File, fileType) {
  return new Promise((resolve, reject) => {
    if (!base64File) {
      return reject("Base64 file data is required");
    }

    let extension, base64Data, key, contentType;

    if (fileType === "image") {
      // Handle base64 image file
      const matches = base64File.match(/^data:image\/(\w+);base64,/);
      if (!matches || matches.length < 2) {
        return reject("Invalid base64 image data");
      }
      extension = matches[1]; // e.g., jpg, png
      base64Data = base64File.replace(/^data:image\/\w+;base64,/, "");
      contentType = `image/${extension}`;
      key = `images/${uuidv4()}.${extension}`;
    } else if (fileType === "pdf") {
      // Handle base64 PDF file
      const matches = base64File.match(/^data:application\/pdf;base64,/);
      if (!matches) {
        return reject("Invalid base64 PDF data");
      }
      extension = "pdf"; // Set extension as PDF
      base64Data = base64File.replace(/^data:application\/pdf;base64,/, "");
      contentType = "application/pdf";
      key = `documents/${uuidv4()}.pdf`;
    } else {
      return reject("Unsupported file type");
    }

    const fileBuffer = Buffer.from(base64Data, "base64");

    const params = {
      Bucket: process.env.BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ContentEncoding: "base64",
      // ACL: 'public-read', // Optional
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        return reject("Failed to upload file to S3");
      }
      const fileUrl = data.Location;
      resolve(fileUrl);
    });
  });
}

//Upload file to s3 and get only the key
function s3Upload(base64File, s3FolderPath = "uploads") {
  return new Promise((resolve, reject) => {
    if (!base64File) {
      return reject("Base64 file data is required");
    }

    // Match base64 header (supports image/png, image/jpeg, application/pdf, etc.)
    const matches = base64File.match(
      /^data:(image|application)\/([a-zA-Z0-9+.-]+);base64,(.+)$/
    );
    if (!matches || matches.length !== 4) {
      return reject("Invalid base64 file format");
    }

    const typeGroup = matches[1]; // "image" or "application"
    const extension = matches[2]; // "png", "jpeg", "pdf", etc.
    const base64Data = matches[3]; // Actual base64 content
    const contentType = `${typeGroup}/${extension}`;

    // Generate unique file key for S3
    const fileKey = `${s3FolderPath}/${uuidv4()}.${extension}`;
    const fileBuffer = Buffer.from(base64Data, "base64");

    const params = {
      Bucket: process.env.BUCKET,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: contentType,
      ContentEncoding: "base64",
      // ACL: 'public-read', // optional
    };

    // Upload to S3
    s3.upload(params)
      .promise()
      .then((data) => resolve(data.Key)) // Only return S3 key
      .catch((err) => {
        console.error("S3 Upload Error:", err);
        reject("Failed to upload file to S3");
      });
  });
}
//Upload Audio
const uploadAudioToS3 = async (file) => {
  try {
    if (!file) {
      throw new Error("No audio file provided");
    }

    const fileName = `audio/${Date.now()}_${file.originalname || "file"}`; // Dynamic file name

    const params = {
      Bucket: process.env.BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    };

    const uploadResult = await s3.upload(params).promise();
    return uploadResult.Location; // Return the S3 URL of the uploaded file
  } catch (error) {
    console.error("Error uploading audio to S3:", error);
    throw error;
  }
};

//Upload File
const uploadFileToS3 = async (file, folder = "uploads") => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    const fileName = `${folder}/${Date.now()}_${file.originalname}`; // Dynamic file name with folder

    const params = {
      Bucket: process.env.BUCKET,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    };

    const uploadResult = await s3.upload(params).promise();
    return uploadResult.Location; // Return the S3 URL of the uploaded file
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
};

const arrayToCSV = (objArray) => {
  const array = typeof objArray !== "object" ? JSON.parse(objArray) : objArray;

  // Create the CSV header from the keys of the first object
  const header = `${Object.keys(array[0])
    .map((value) => `"${value}"`)
    .join(",")}\r\n`;

  // Convert the array of objects into CSV rows
  return array.reduce((csvString, nextObj) => {
    const row = `${Object.values(nextObj)
      .map((value) => `"${value}"`)
      .join(",")}\r\n`;

    return csvString + row;
  }, header);
};

//Push To bucket
const pushToS3Bucket = async (array, folderName) => {
  // Convert the JSON array to an array of JavaScript objects
  try {
    const objectsArray = JSON.parse(JSON.stringify(array));

    // Convert the array of objects to CSV
    const csv = await arrayToCSV(objectsArray);
    const csvString = await csv?.toString();

    // Encode the CSV string as UTF-8
    const csvBuffer = Buffer.from(csvString, "utf-8");

    // Generate a unique file name
    let s3path = new Date().getTime() + "-" + uuidv4() + ".csv";

    const params = {
      Bucket: process.env.BUCKET,
      Key: `${folderName}/${s3path}`,
      Body: csvBuffer,
      ContentType: "text/csv; charset=utf-8",
    };

    // Upload the file to S3
    const s3response = await s3.upload(params).promise();
    return s3response.Key;
  } catch (error) {
    console.log(error.message);
  }
};

//Signed URL for excel files
const getSignedUrl = async (key) => {
  // Accept s3 as a parameter
  try {
    const params = {
      Bucket: process.env.BUCKET,
      Key: key,
      Expires: 5000,
      ResponseContentDisposition: "attachment",
    };
    const s3info = await s3.getSignedUrlPromise("getObject", params);
    return s3info;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
};

//Signed URL for image files
const getSignedUrlImage = async (key) => {
  try {
    const params = {
      Bucket: process.env.BUCKET,
      Key: key,
      Expires: 5000,
    };

    const s3info = await s3.getSignedUrlPromise("getObject", params);
    return s3info;
  } catch (error) {
    return null;
  }
};

//Upload raw file to s3
const uploadRawFileToS3 = async (fileBuffer, fileName, folderName) => {
  const s3path = new Date().getTime() + "-" + uuidv4() + "-" + fileName;

  const params = {
    Bucket: process.env.BUCKET,
    Key: `${folderName}/${s3path}`,
    Body: fileBuffer,
    ContentType: "application/octet-stream", // or you can set the content type based on file type
  };

  // Upload the raw file to S3
  const s3response = await s3.upload(params).promise();
  return s3response.Key;
};

//Delete s3 data
function deleteImageFromS3(key) {
  return new Promise((resolve, reject) => {
    if (!key) {
      return reject("Key is required to delete image");
    }

    const params = {
      Bucket: process.env.BUCKET,
      Key: key,
    };

    s3.deleteObject(params, (err, data) => {
      if (err) {
        return reject("Failed to delete image from S3");
      }
      resolve("Image deleted successfully");
    });
  });
}

module.exports = {
  uploadToS3,
  uploadAudioToS3,
  uploadFileToS3,
  pushToS3Bucket,
  getSignedUrl,
  getSignedUrlImage,
  uploadRawFileToS3,
  s3Upload,
  deleteImageFromS3,
};
