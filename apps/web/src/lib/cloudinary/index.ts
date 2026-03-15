import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

interface UploadOptions {
  folder?: string;
  resource_type?: "image" | "video" | "raw" | "auto";
  public_id?: string;
  transformation?: Array<Record<string, unknown>>;
}

export async function uploadToCloudinary(buffer: Buffer, options: UploadOptions) {
  return new Promise<{
    secure_url: string;
    public_id: string;
    format: string;
    duration?: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resource_type ?? "auto",
        public_id: options.public_id,
        transformation: options.transformation,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Upload failed"));
        } else {
          resolve(result as never);
        }
      },
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string, resourceType = "image") {
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType as "image" | "video" | "raw",
  });
}
