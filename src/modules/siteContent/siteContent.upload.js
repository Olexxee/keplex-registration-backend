import multer from "multer";
import { randomUUID } from "node:crypto";
import { cloudinary } from "../../config/cloudinary.js";
import { BadRequestError } from "../../classes/errorClasses.js";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => imageTypes.has(file.mimetype)
    ? cb(null, true)
    : cb(new BadRequestError("Unsupported image type. Use JPEG, PNG, WEBP, or GIF.")),
});
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => file.mimetype === "application/pdf" && file.originalname.toLowerCase().endsWith(".pdf")
    ? cb(null, true)
    : cb(new BadRequestError("Only PDF documents are accepted.")),
});
export const uploadSiteImage = imageUpload.single("file");
export const uploadResourcePdf = pdfUpload.single("file");

const uploadBuffer = ({ buffer, folder, resourceType, publicId }) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType, public_id: publicId, overwrite: false }, (error, result) => {
    if (error) return reject(error);
    if (!result) return reject(new Error("Cloudinary upload returned no result"));
    resolve({ url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type, format: result.format, bytes: result.bytes });
  });
  stream.end(buffer);
});

export const uploadImageAsset = async (file, folder = "kpx/site-content") => {
  if (!file) throw new BadRequestError("Image file is required");
  return uploadBuffer({ buffer: file.buffer, folder, resourceType: "image", publicId: randomUUID() });
};

export const uploadPdfAsset = async (file) => {
  if (!file) throw new BadRequestError("PDF file is required");
  if (file.buffer.length < 5 || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new BadRequestError("The uploaded file is not a valid PDF document");
  }
  return uploadBuffer({ buffer: file.buffer, folder: "kpx/resources", resourceType: "raw", publicId: `${randomUUID()}.pdf` });
};
