import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const API_URL = process.env.API_URL || 'https://api.attendance.angad.page';
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
