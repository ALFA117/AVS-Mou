.PHONY: setup validator er build test test-e2e deploy-testnet frontend clean

# --- Setup ---
setup:
	cd frontend && npm install
	anchor build

# --- Local infra ---
validator:
	solana-test-validator --reset

er:
	@echo "Start the MagicBlock Ephemeral Rollup instance (see docs/AVS_100_TASKS.md task 009)"

# --- Contracts ---
build:
	anchor build

test:
	anchor test

test-e2e:
	cd tests && npx playwright test

deploy-testnet:
	anchor deploy --provider.cluster testnet

# --- Frontend ---
frontend:
	cd frontend && npm run dev

# --- Housekeeping ---
clean:
	anchor clean
	rm -rf frontend/.next frontend/node_modules
