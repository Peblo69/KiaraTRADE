import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import millify from "millify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatNumber = (value: number | undefined | null): string => {
  if (typeof value !== 'number' || isNaN(value)) return '0.00';

  if (value > 1000000) {
    return millify(value, {
      precision: 2
    });
  }

  if (value < 0.01) {
    return value.toFixed(6);
  }

  return value.toFixed(2);
};

export const formatPrice = (price: number | undefined | null): string => {
  if (typeof price !== 'number' || isNaN(price)) return '$0.00';
  return `$${price.toFixed(8)}`;
};

export const formatMarketCap = (marketCap: number | undefined | null): string => {
  if (typeof marketCap !== 'number' || isNaN(marketCap)) return '$0';
  return `$${millify(marketCap)}`;
};

export const formatSolPrice = (price: number) => {
  if (price < 0.0001) {
    return '< 0.0001 SOL';
  }
  return `${price.toFixed(8)} SOL`;
};