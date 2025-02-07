import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import millify from "millify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
}

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