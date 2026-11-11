import { productsRepository, type ProductFilters } from "@/server/products/repository";

export async function listProducts(filters: ProductFilters) {
  return productsRepository.list(filters);
}
