.PHONY: setup devnet-setup build idl test test-e2e deploy-devnet deploy-testnet frontend clean

# --- Setup ---
# `anchor build` panics on native Windows (cargo-build-sbf subprocess bug —
# see docs/WINDOWS_NOTES.md). Build each program with `cargo build-sbf`
# directly instead (works fine), then generate the IDL separately.
setup:
	cd frontend && npm install

devnet-setup:
	solana config set --url devnet
	solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/id.json --force
	solana airdrop 2

# --- Contracts ---
# Builds every program under /programs (each with its own Cargo.toml).
build:
	@for dir in programs/*/; do \
		if [ -f "$$dir/Cargo.toml" ]; then \
			echo "Building $$dir"; \
			(cd "$$dir" && cargo build-sbf) || exit 1; \
		fi; \
	done

idl:
	mkdir -p target/idl target/types
	anchor idl build -p sealed_auction -o target/idl/sealed_auction.json -t target/types/sealed_auction.ts
	anchor idl build -p private_voting -o target/idl/private_voting.json -t target/types/private_voting.ts
	anchor idl build -p spl_token_manager -o target/idl/spl_token_manager.json -t target/types/spl_token_manager.ts

test:
	anchor test --skip-local-validator --provider.cluster devnet

test-e2e:
	cd tests && npx playwright test

deploy-devnet:
	anchor deploy --provider.cluster devnet

deploy-testnet:
	anchor deploy --provider.cluster testnet

# --- Frontend ---
frontend:
	cd frontend && npm run dev

# --- Housekeeping ---
clean:
	anchor clean
	rm -rf frontend/.next frontend/node_modules
