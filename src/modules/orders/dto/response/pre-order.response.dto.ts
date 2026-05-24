export class PreOrderItemResponseDto {
  productDetailId: number;
  productId: string;
  name: string;
  thumbnail: string;
  color: string;
  size: string;
  price: string;
  quantity: number;
  totalPrice: string;
}

export class PreOrderResponseDto {
  totalAmount: string;
  items: PreOrderItemResponseDto[];
}
