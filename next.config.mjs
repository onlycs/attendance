/** @type {import('next').NextConfig} */
const nextConfig = {
	publicRuntimeConfig: {
		NODE_ENV: process.env.NODE_ENV,
		API_URL: process.env.API_URL,
		API_URL_DEV: process.env.API_URL_DEV || process.env.API_URL,
	}
};

export default nextConfig;
