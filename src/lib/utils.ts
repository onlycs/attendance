import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import config from 'next/config';

const { publicRuntimeConfig } = config();
const { API_URL: API_URL_PROD, API_URL_DEV, NODE_ENV } = publicRuntimeConfig;
export const API_URL = NODE_ENV === 'production' ? API_URL_PROD : API_URL_DEV;

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
