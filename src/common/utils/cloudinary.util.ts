import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

/**
 * Upload một file ảnh lên Cloudinary
 * Hàm này cấu hình và tự động chuyển đổi buffer của multer thành stream
 * 
 * @param file File ảnh được lấy từ Multer (@UploadedFile())
 * @param folder Thư mục trên Cloudinary (mặc định là 'datn-utc')
 * @returns Promise chứa thông tin response từ Cloudinary (URL ảnh sẽ nằm ở result.secure_url)
 */
export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = 'datn-utc',
): Promise<UploadApiResponse> => {
  // Do sử dụng function độc lập, ta sẽ đọc thẳng từ process.env
  // (Yêu cầu phải import thư viện dotenv ở main.ts hoặc để NestJS ConfigModule tự load trước đó)
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error: UploadApiErrorResponse, result: UploadApiResponse) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    // Chuyển file buffer sang Readable Stream để pipe vào Cloudinary
    Readable.from(file.buffer).pipe(uploadStream);
  });
};
