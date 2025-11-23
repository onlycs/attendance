.PHONY: all build api openapi client frontend clean help

all: build

release: backend openapi frontend
build: backend-dev openapi typecheck

backend:
	@echo "Building API in release mode..."
	cd src-api && cargo build --release

backend-dev:
	@echo "Building API..."
	cd src-api && cargo build

openapi:
	@echo "Generating OpenAPI spec..."
	cd src-api && cargo run --bin openapi
	bun api

frontend:
	@echo "Building frontend..."
	bun run build

typecheck:
	@echo "Checking frontend..."
	bunx nuxi typecheck
