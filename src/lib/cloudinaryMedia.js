import { cloudinary } from "../config/cloudinary.js";

const getResourceType = (mimeType) => {
  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "image";
};

export const uploadMedia = ({ buffer, mimeType, folder }) => {
  return new Promise((resolve, reject) => {
    const resourceType = getResourceType(mimeType);

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result) {
          return reject(new Error("Cloudinary upload returned no result"));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
          width: result.width ?? null,
          height: result.height ?? null,
          duration: result.duration ?? null,
        });
      },
    );

    stream.end(buffer);
  });
};

export const deleteMedia = async ({ publicId, resourceType = "image" }) => {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
  });
};
