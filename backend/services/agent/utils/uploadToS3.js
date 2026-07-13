import cloudinary from "./cloudinary.js";

const getResourceType = (contentType = "", fileName = "") => {
  if (contentType.startsWith("image/")) return "image";
  if (
    contentType.includes("pdf") ||
    contentType.includes("presentation") ||
    contentType.includes("officedocument") ||
    fileName.endsWith(".pdf") ||
    fileName.endsWith(".pptx")
  ) {
    return "raw";
  }
  return "auto";
};

export const uploadToS3 = async (buffer, fileName, contentType) => {
  const resource_type = getResourceType(contentType, fileName);
  const publicId = fileName.replace(/\.[^/.]+$/, "");

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "cortex-ai",
        public_id: publicId,
        resource_type,
        overwrite: true,
      },
      (error, uploaded) => {
        if (error) reject(error);
        else resolve(uploaded);
      }
    );

    stream.end(buffer);
  });

  return result.secure_url;
};
