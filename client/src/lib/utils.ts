import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import millify from "millify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatPrice = (price: number | undefined | null): string => {
  if (typeof price !== 'number' || isNaN(price)) return '$0.00';
  return `$${price.toFixed(8)}`;
};

export const formatMarketCap = (marketCap: number | undefined | null): string => {
  if (typeof marketCap !== 'number' || isNaN(marketCap)) return '$0';
  return `$${millify(marketCap)}`;
};