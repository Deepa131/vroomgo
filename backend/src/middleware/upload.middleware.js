const multer = require("multer");
const path = require("path");
const fs = require("fs");

const maxImageSize = 5 * 1024 * 1024; // 5MB
const maxVideoSize = 50 * 1024 * 1024; // 50MB

// Extension is only a filename hint an attacker fully controls; the real
// check is the browser/OS-detected MIME type on the uploaded bytes
// (file.mimetype), which multer derives independently of the filename.
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo"];
const ALLOWED_IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;
const ALLOWED_VIDEO_EXT = /\.(mp4|mov|avi)$/i;

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "";

    if (file.fieldname === "profilePicture") {
      uploadPath = path.join(__dirname, "../../public/profile_pictures");
    } else if (file.fieldname === "images") {
      uploadPath = path.join(__dirname, "../../public/vehicle_images");
    } else if (file.fieldname === "videos") {
      uploadPath = path.join(__dirname, "../../public/vehicle_videos");
    } else {
      return cb(new Error("Invalid field name for upload"), "");
    }

    ensureDir(uploadPath);
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    // Server-generated random filename - the client-supplied name (and its
    // extension) is never trusted or used to build a path.
    const safeExt = ALLOWED_IMAGE_EXT.test(file.originalname)
      ? path.extname(file.originalname).toLowerCase()
      : ALLOWED_VIDEO_EXT.test(file.originalname)
      ? path.extname(file.originalname).toLowerCase()
      : "";
    const prefix =
      file.fieldname === "profilePicture"
        ? "avatar"
        : file.fieldname === "images"
        ? "vehicle-img"
        : "vehicle-vid";

    cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

// Checks BOTH the file extension and the actual MIME type multer reports for
// the upload stream, and rejects anything that doesn't match on both counts -
// an extension-only check can be bypassed by a malicious file simply renamed
// to end in .png.
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "profilePicture" || file.fieldname === "images") {
    if (!ALLOWED_IMAGE_EXT.test(file.originalname) || !ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG or WEBP image files are allowed"));
    }
    return cb(null, true);
  }

  if (file.fieldname === "videos") {
    if (!ALLOWED_VIDEO_EXT.test(file.originalname) || !ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only MP4, MOV or AVI video files are allowed"));
    }
    return cb(null, true);
  }

  cb(new Error("Invalid field name for upload"));
};

const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxImageSize },
});

const uploadVideo = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxVideoSize },
});

module.exports = { uploadImage, uploadVideo };
