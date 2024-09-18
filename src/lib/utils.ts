import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const API_URL = process.env.API_URL || "http://localhost:8080";
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
