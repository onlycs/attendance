import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
    input: "./src-api/openapi.yml",
    output: "app/utils/api/hey",
    plugins: ["@hey-api/client-fetch"],
});
