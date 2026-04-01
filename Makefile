SHELL := bash

.PHONY: all wasm openapi fmt typegen postinstall

all: build

wasm:
	@echo "=== Building WASM package"
	cd src-crypto && rm -rf pkg && wasm-pack build --target web --release
	@echo "=== Copying package files"
	rm -rf public/wasm
	cp -r src-crypto/pkg public/wasm
	@echo "=== Patching workerHelpers.js files"
	sed -i 's|\.\./\.\./\.\.|../../../attendance_crypto.js|g' public/wasm/snippets/*/src/workerHelpers.js

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
	prettier -w app/utils/api
	@echo "=== Patching"
	perl -i -0777 -pe 's/event_type\?:.*?;.*?;/event_type?: EventTypeFilter;/gs' app/utils/api/hey/types.gen.ts

fmt:
	@echo "=== Formatting code"
	bun fmt
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
	bun generate

postinstall: openapi wasm fmt typegen
