import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductRepository } from './repositories/product.repository';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { ProductEntity } from './entities/product.entity';
import { ProductDetailEntity } from './entities/product-detail.entity';
import { ProductImageEntity } from './entities/product-image.entity';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<ProductEntity[]> {
    return this.productRepository.find({
      relations: {
        category: true,
        details: true,
        images: true,
      },
    });
  }

  async findById(id: string): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: {
        category: true,
        details: true,
        images: true,
      },
    });
    if (!product) {
      throw new NotFoundException('Product không tồn tại');
    }
    return product;
  }

  async createWithImages(
    createProductDto: CreateProductDto,
    files: Express.Multer.File[],
  ): Promise<ProductEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create Product
      const product = new ProductEntity();
      product.name = createProductDto.name;
      product.description = createProductDto.description;
      product.brand = createProductDto.brand;
      product.origin = createProductDto.origin;
      product.categoryId = createProductDto.categoryId;

      // 2. Create Details
      if (createProductDto.details && createProductDto.details.length > 0) {
        product.details = createProductDto.details.map((d) => {
          const detail = new ProductDetailEntity();
          detail.color = d.color;
          detail.size = d.size;
          detail.price = d.price;
          detail.stock = d.stock;
          return detail;
        });
      }

      // 3. Create Images (Mock Upload)
      if (files && files.length > 0) {
        product.images = files.map((file, index) => {
          const image = new ProductImageEntity();
          // Mock Cloud URL
          image.imageUrl = `https://mock-cloud.com/images/mock-${Date.now()}-${file.originalname}`;
          image.isThumbnail = index === 0; // First image is thumbnail
          return image;
        });
      }
      const savedProduct = await queryRunner.manager.save(
        ProductEntity,
        product,
      );
      await queryRunner.commitTransaction();
      return this.findById(savedProduct.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    files: Express.Multer.File[],
  ): Promise<ProductEntity> {
    const product = await this.findById(id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update Base Product
      if (dto.name !== undefined) product.name = dto.name;
      if (dto.description !== undefined) product.description = dto.description;
      if (dto.brand !== undefined) product.brand = dto.brand;
      if (dto.origin !== undefined) product.origin = dto.origin;
      if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;

      await queryRunner.manager.save(ProductEntity, product);

      // 2. Sync Details
      if (dto.details) {
        const existingDetails = product.details || [];
        const payloadDetails = dto.details;

        const payloadDetailIds = payloadDetails.map((d) => d.id).filter((id) => id);

        // Delete missing details
        const detailsToDelete = existingDetails.filter(
          (ed) => !payloadDetailIds.includes(ed.id),
        );
        if (detailsToDelete.length > 0) {
          await queryRunner.manager.remove(ProductDetailEntity, detailsToDelete);
        }

        // Update existing & Create new
        for (const pd of payloadDetails) {
          if (pd.id) {
            const detailToUpdate = existingDetails.find((ed) => ed.id === pd.id);
            if (detailToUpdate) {
              detailToUpdate.color = pd.color;
              detailToUpdate.size = pd.size;
              detailToUpdate.price = pd.price;
              detailToUpdate.stock = pd.stock;
              await queryRunner.manager.save(ProductDetailEntity, detailToUpdate);
            }
          } else {
            const newDetail = new ProductDetailEntity();
            newDetail.color = pd.color;
            newDetail.size = pd.size;
            newDetail.price = pd.price;
            newDetail.stock = pd.stock;
            newDetail.productId = product.id;
            await queryRunner.manager.save(ProductDetailEntity, newDetail);
          }
        }
      }

      // 3. Sync Images
      if (dto.retained_image_ids !== undefined) {
        const existingImages = product.images || [];
        const retainedIds = dto.retained_image_ids;

        // Delete images not in retained_image_ids
        const imagesToDelete = existingImages.filter(
          (img) => !retainedIds.includes(img.id),
        );
        if (imagesToDelete.length > 0) {
          await queryRunner.manager.remove(ProductImageEntity, imagesToDelete);
        }
      }

      if (files && files.length > 0) {
        // Insert new images
        const existingImages = product.images || [];
        const retainedIds = dto.retained_image_ids || [];
        
        // Determine if we already have a thumbnail among retained images
        const isThumbnailExists = existingImages.some(
          (img) => retainedIds.includes(img.id) && img.isThumbnail,
        );

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const image = new ProductImageEntity();
          image.imageUrl = `https://mock-cloud.com/images/mock-${Date.now()}-${file.originalname}`;
          image.isThumbnail = !isThumbnailExists && i === 0; // Set first new image as thumbnail if no retained thumbnail
          image.productId = product.id;
          await queryRunner.manager.save(ProductImageEntity, image);
        }
      }

      await queryRunner.commitTransaction();
      return this.findById(product.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
