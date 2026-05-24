import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/request/create-product.dto';
import { UpdateProductDto } from './dto/request/update-product.dto';
import { ProductResponseDto } from './dto/response/product.response.dto';
import { ProductFilterRequestDto } from './dto/request/product-filter.request.dto';
import { UpdateProductStatusDto } from './dto/request/update-product-status.dto';
import { BaseResponse } from '../../core/base/base.response';
import { uploadToCloudinary } from '../../common/utils/cloudinary.util';
import { RoleEnum } from 'src/common/enums/role.enum';
import { Roles } from 'src/core/decorators/roles.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── ADMIN ROUTES (static trước, phải đứng TRƯỚC dynamic ':id') ──────────

  @Roles(RoleEnum.ADMIN)
  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tạo sản phẩm kèm hình ảnh và chi tiết' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.createWithImages(
      createProductDto,
      files,
    );
    return product.toResponse();
  }

  @Roles(RoleEnum.ADMIN)
  @Get('admin/list')
  @ApiOperation({ summary: 'Lấy danh sách tất cả sản phẩm (Dành cho Admin)' })
  @ApiResponse({ status: 200, type: BaseResponse<ProductResponseDto[]> })
  async adminFindAll(
    @Query() filterDto: ProductFilterRequestDto,
  ): Promise<BaseResponse<ProductResponseDto[]>> {
    const [products, totalElement] = await this.productsService.findAll(
      filterDto,
      true,
    );
    const data = products.map((prod) => prod.toResponse());
    return new BaseResponse(
      200,
      'Lấy danh sách sản phẩm thành công',
      data,
      totalElement,
    );
  }

  @Roles(RoleEnum.ADMIN)
  @Patch('admin/:id/status')
  @ApiOperation({ summary: 'Ẩn/Hiện sản phẩm (Dành cho Admin)' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateProductStatusDto,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.updateStatus(
      id,
      updateStatusDto.isPublished,
    );
    return product.toResponse();
  }

  @Roles(RoleEnum.ADMIN)
  @Get('admin/:id')
  @ApiOperation({ summary: 'Lấy chi tiết 1 sản phẩm (Dành cho Admin)' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async adminFindOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const product = await this.productsService.findById(id, true);
    return product.toResponse();
  }

  @Roles(RoleEnum.ADMIN)
  @Put(':id')
  @UseInterceptors(FilesInterceptor('images'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Cập nhật sản phẩm' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.updateProduct(
      id,
      updateProductDto,
      files,
    );
    return product.toResponse();
  }

  // ─── PUBLIC / USER ROUTES (dynamic ':id' phải đứng SAU static routes) ────

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm (Dành cho User)' })
  @ApiResponse({ status: 200, type: BaseResponse<ProductResponseDto[]> })
  async findAll(
    @Query() filterDto: ProductFilterRequestDto,
  ): Promise<BaseResponse<ProductResponseDto[]>> {
    const [products, totalElement] = await this.productsService.findAll(
      filterDto,
      false,
    );
    const data = products.map((prod) => prod.toResponse());
    return new BaseResponse(
      200,
      'Lấy danh sách sản phẩm thành công',
      data,
      totalElement,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết 1 sản phẩm (Dành cho User)' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const product = await this.productsService.findById(id, false);
    return product.toResponse();
  }
}
