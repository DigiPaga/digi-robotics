.PHONY: help install build test dev deploy-docker deploy-contracts clean

help: ## Show this help message
\t@grep -E '^[a-zA-Z_-]+:.*?## .*60990' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", \$1\, \$2\}'

install: ## Install all dependencies
\t@echo "Installing dependencies..."
\tcd contracts && forge install
\tcd x402-server && npm install
\tcd web && npm install

build: ## Build all components
\t@echo "Building..."
\tcd contracts && forge build
\tcd x402-server && npm run build
\tcd web && npm run build

test: ## Run all tests
\t@echo "Running tests..."
\tcd contracts && forge test
\tcd x402-server && npm test

dev: ## Start development servers
\t@echo "Starting development servers..."
\t@echo "Use 'make dev-server' or 'make dev-web' to start individual services"

dev-server: ## Start x402 server in development
\tcd x402-server && npm run dev

dev-web: ## Start frontend in development
\tcd web && npm run dev

deploy-contracts: ## Deploy smart contracts
\t@echo "Deploying contracts..."
\tcd contracts && forge script script/Deploy.s.sol --rpc-url \$RPC_URL --broadcast --verify

deploy-docker: ## Deploy with Docker Compose
\t@echo "Deploying with Docker Compose..."
\tdocker-compose up -d

clean: ## Clean build artifacts
\t@echo "Cleaning..."
\trm -rf contracts/out
\trm -rf contracts/cache
\trm -rf x402-server/dist
\trm -rf web/.next

lint: ## Run linters
\t@echo "Running linters..."
\tcd x402-server && npm run lint
\tcd web && npm run lint

format: ## Format code
\t@echo "Formatting code..."
\tprettier --write "**/*.{ts,tsx,json,md}"
