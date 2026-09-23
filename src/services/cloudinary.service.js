const cloudinary = require("../config/cloudinary");

const uploadImage = async (file) => {
  if (!file) {
    throw new Error("No image file provided");
  }

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "bud-n-budder/products",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

module.exports = {
  uploadImage,
};