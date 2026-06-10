import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Like, FindOptionsWhere } from 'typeorm';
import { ProductRepository } from './repositories/product.repository';
import { CreateProductDto } from './dto/request/create-product.dto';
import {
  UpdateProductDto,
  ParsedDetailItem,
} from './dto/request/update-product.dto';
import { ProductEntity } from './entities/product.entity';
import { ProductDetailEntity } from './entities/product-detail.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { ProductFilterRequestDto } from './dto/request/product-filter.request.dto';
import { uploadToCloudinary } from '../../common/utils/cloudinary.util';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    filterDto: ProductFilterRequestDto,
    isAdmin: boolean,
  ): Promise<[ProductEntity[], number]> {
    const {
      page = 1,
      size = 10,
      name,
      categoryId,
      brand,
      origin,
      isPublished,
    } = filterDto;
    const skip = (page - 1) * size;
    console.log('isAdmin', isAdmin, isPublished);

    const where: FindOptionsWhere<ProductEntity> = {};

    if (isAdmin) {
      if (isPublished !== undefined) {
        where.isPublished = isPublished;
      }
    } else {
      console.log('hello');
      where.isPublished = true;
    }

    if (name) {
      where.name = Like(`%${name}%`);
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (brand) {
      where.brand = Like(`%${brand}%`);
    }
    if (origin) {
      where.origin = Like(`%${origin}%`);
    }

    const order: any = {};
    if (isAdmin) {
      order.createdAt = 'DESC';
    }

    return this.productRepository.findAndCount({
      where,
      relations: {
        category: true,
        details: true,
        images: true,
      },
      order,
      skip,
      take: size,
    });
  }

  async findById(id: string, isAdmin: boolean): Promise<ProductEntity> {
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
    if (!isAdmin && product.isPublished === false) {
      throw new NotFoundException('Product không tồn tại');
    }
    return product;
  }

  async updateStatus(id: string, isPublished: boolean): Promise<ProductEntity> {
    const product = await this.findById(id, true);
    product.isPublished = isPublished;
    return this.productRepository.save(product);
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
      const product = ProductEntity.create(createProductDto);

      // 2. Create Details
      if (createProductDto.details && createProductDto.details.length > 0) {
        product.details = createProductDto.details.map((d) =>
          ProductDetailEntity.create(d),
        );
      }

      // 3. Upload Images to Cloudinary
      if (files && files.length > 0) {
        product.images = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uploadResult = await uploadToCloudinary(file, 'products');

          const isThumbnail = i === 0; // First image is thumbnail
          const image = ProductImageEntity.create(
            uploadResult.secure_url,
            isThumbnail,
          );
          product.images.push(image);
        }
      }
      const savedProduct = await queryRunner.manager.save(
        ProductEntity,
        product,
      );
      await queryRunner.commitTransaction();
      return this.findById(savedProduct.id, true);
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
    const product = await this.findById(id, true);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update Base Product
      product.update({ ...dto });

      await queryRunner.manager.save(ProductEntity, product);

      // 2. Sync Details
      if (dto.details) {
        const existingDetails = product.details || [];
        const payloadDetails = dto.details;

        const payloadDetailIds = payloadDetails
          .map((d) => d.id)
          .filter((detailId): detailId is number => detailId !== undefined);

        // Delete missing details
        const detailsToDelete = existingDetails.filter(
          (ed) => !payloadDetailIds.includes(ed.id),
        );
        if (detailsToDelete.length > 0) {
          await queryRunner.manager.remove(
            ProductDetailEntity,
            detailsToDelete,
          );
        }

        // Update existing & Create new
        for (const pd of payloadDetails) {
          if (pd.id) {
            const detailToUpdate = existingDetails.find(
              (ed) => ed.id === pd.id,
            );
            if (detailToUpdate) {
              detailToUpdate.update(pd);
              await queryRunner.manager.save(
                ProductDetailEntity,
                detailToUpdate,
              );
            }
          } else {
            const newDetail = ProductDetailEntity.create(pd);
            newDetail.productId = product.id;
            await queryRunner.manager.save(ProductDetailEntity, newDetail);
          }
        }
      }

      // 3. Sync Images
      if (dto.retained_image_ids !== undefined) {
        const existingImages = product.images || [];
        const retainedIds = dto.retained_image_ids;

        const imagesToDelete = existingImages.filter(
          (img) => !retainedIds.includes(img.id),
        );
        if (imagesToDelete.length > 0) {
          await queryRunner.manager.remove(ProductImageEntity, imagesToDelete);
        }
      }

      if (files && files.length > 0) {
        const existingImages = product.images || [];
        const retainedIds = dto.retained_image_ids || [];

        const isThumbnailExists = existingImages.some(
          (img) => retainedIds.includes(img.id) && img.isThumbnail,
        );

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uploadResult = await uploadToCloudinary(file, 'products');

          const isThumbnail = !isThumbnailExists && i === 0;
          const image = ProductImageEntity.create(
            uploadResult.secure_url,
            isThumbnail,
            product.id,
          );
          await queryRunner.manager.save(ProductImageEntity, image);
        }
      }

      await queryRunner.commitTransaction();
      return this.findById(product.id, true);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
