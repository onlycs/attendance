.PHONY: all wasm openapi fmt typegen postinstall

all: build

wasm:
	@echo "=== Building WASM package"
	cd src-crypto && rm -rf pkg && wasm-pack build --target web --release
	@echo "=== Copying package files"
	rm -rf app/wasm
	cp -r src-crypto/pkg app/wasm
	@echo "=== Patching workerHelpers.js files"
	sed -i 's|\.\./\.\./\.\.|../../../attendance_crypto.js|g' app/wasm/snippets/*/src/workerHelpers.js

openapi:
	@echo "=== Generating OpenAPI spec"
	cd src-api && cargo run --bin openapi
	@echo "=== Removing old API client"
	rm -rf app/utils/api/hey
	@echo "=== Generating API client"
	bunx openapi-ts
	@echo "=== Re-exporting API client"
	python scripts/openapi.py
	@echo "=== Formatting generated files"
	dprint fmt app/utils/api/**/* app/utils/api/*

fmt:
	@echo "=== Formatting code"
	dprint fmt
	cd src-api && cargo fmt
	cd src-crypto && cargo fmt
	cd src-macro && cargo fmt

typegen:
	@echo "=== Generating TypeScript types"
	bunx nuxi prepare

build:
	@echo "=== Building the API"
	cd src-api && cargo build --release

	@echo "=== Installing dependencies"
	bun i # will run `make postinstall` (see package.json)

	@echo "=== Building frontend"
	bun run build

postinstall: openapi wasm fmt typegen
