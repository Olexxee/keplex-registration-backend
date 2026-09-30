import multer from "multer";
import { BadRequestError } from "../classes/errorClasses.js";

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const fileFilter = (_req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(
      new BadRequestError(
        "Unsupported media type. Allowed types: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV",
      ),
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export const uploadSingleMedia = upload.single("media");

export const uploadMultipleMedia = upload.array("media", 10);
