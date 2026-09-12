import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Склеивает классы Tailwind так, чтобы более поздний побеждал более ранний.
 * `cn("p-2", "p-4")` → `"p-4"`, а не `"p-2 p-4"`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
