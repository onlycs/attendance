/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: (config, _) => {
		return {
			...config,
			watchOptions: {
				...config.watchOptions,
				ignored: /(src-api)|(node_modules)|(.git)/,
			},
		};
	},
};

export default nextConfig;
