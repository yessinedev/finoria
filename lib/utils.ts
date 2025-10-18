import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency values consistently across the application
 * @param amount - The amount to format
 * @param currency - The currency code (default: TND)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = "TND"): string {
  // Handle undefined, null, or NaN values
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }
  
  // Format to 3 decimal places and add currency symbol
  // Using a space as thousands separator and a dot as decimal separator for clarity
  const formattedAmount = amount.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formattedAmount} ${currency}`;
}

/**
 * Format quantity values consistently across the application
 * @param quantity - The quantity to format
 * @returns Formatted quantity string without unnecessary decimal places
 */
export function formatQuantity(quantity: number): string {
  // Handle undefined, null, or NaN values
  if (quantity === undefined || quantity === null || isNaN(quantity)) {
    quantity = 0;
  }
  
  // If it's a whole number, don't show decimal places
  if (Number.isInteger(quantity)) {
    // Format with space as thousands separator
    return quantity.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  
  // For non-whole numbers, show 3 decimal places with space as thousands separator
  return quantity.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}