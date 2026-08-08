# Windows Development Notes

This project is developed on native Windows (no WSL2/Ubuntu — by explicit
choice). Two upstream tools have confirmed, unfixed native-Windows bugs. This
doc records what's broken, what was tried, and the workaround in use.

## 1. `solana-test-validator` does not run natively on Windows

**Symptom**: every run fails identically, regardless of `--reset`:

```
Error: failed to start validator: Failed to create ledger at test-ledger:
io error: Error checking to unpack genesis archive: IO error: Acceso denegado. (os error 5)
```

**Root cause**: confirmed upstream issue, native to Windows —
[anza-xyz/agave#24](https://github.com/anza-xyz/agave/issues/24). The
validator's internal archive-unpacking code fails on Windows; the official
guidance from the Solana/Agave team is to use WSL.

**What we ruled out** (all tested on this machine, none fixed it):
- Windows "Developer Mode" (fixes a *different*, earlier symlink-privilege
  error — worth keeping enabled regardless, see below — but not this one)
- Moving the project outside OneDrive sync (project was never actually
  inside a synced path once this was tested; ruled out as a cause)
- Windows Defender exclusions, both via `Add-MpPreference` (silently
  no-ops under Tamper Protection) and via the Windows Security GUI
  (persisted correctly, still no effect)
- Downgrading to Solana CLI 3.1.10 (fails identically to 4.1.2)
- Manually pre-extracting `genesis.tar.bz2` with external `tar` (works fine
  standalone) and restoring the files so the validator would only need to
  read, not unpack — it still re-attempts (and fails) its own unpack step
  on every start, `--reset` or not

**Consequence**: MagicBlock's local dev stack (`mb-stack`, from
`@magicblock-labs/ephemeral-validator`) wraps this same validator binary
(base L1 + ephemeral-validator + QFS as one supervised process), so it's
equally broken here.

**Workaround in use**: skip local infrastructure entirely. All development
and testing targets **Solana Devnet** + **MagicBlock's hosted Devnet
Ephemeral Rollup** (US/EU/Asia — see `.env.local.example`). Anchor.toml's
`[provider] cluster` is set to `devnet`. This also matches what the project
needs for the hackathon submission anyway (testnet/devnet deployment is
required regardless — see `docs/AVS_100_TASKS.md` task 093).

If local validator support becomes a hard requirement later, the only known
fix is WSL2 (or a Linux CI runner) — there is no native-Windows fix at time
of writing.

## 2. `anchor build` panics on native Windows (different bug)

**Symptom**:

```
thread 'main' (...) panicked at .../cargo-build-sbf-4.1.0/src/toolchain.rs:357:19:
called `Option::unwrap()` on a `None` value
```

Reproduces on every `anchor build` invocation, across anchor-cli 1.0.2,
1.1.2, and 0.30.1 (avm-managed), and regardless of `--tools-version`
pinning. Confirmed **not** related to the anchor-cli 1.1.2 issue where it
hardcodes `--tools-version v1.52` (anchor 0.30.1 doesn't hardcode any
version and panics identically).

**What works**: calling the underlying tools directly, exactly as `anchor
build` would internally:

```bash
cd programs/<program-name>
cargo build-sbf        # compiles fine — this is what actually panics via anchor's subprocess spawn
cd ../..
anchor idl build        # IDL generation works standalone, no SBF toolchain involved
```

Every manual replication of anchor's own build steps (same cwd, same args,
same env, different installed toolchain versions) succeeds. The panic is
specific to how `anchor build` spawns the `cargo build-sbf` child process on
Windows — root cause not fully isolated, but easily and reliably worked
around.

**Workaround in use**: `make build` loops over `/programs/*` running `cargo
build-sbf` directly per program; `make idl` runs `anchor idl build`
separately. Do not use `anchor build` on this machine.

## Windows settings changed for this project

- **Developer Mode** enabled (`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock\AllowDevelopmentWithoutDevLicense = 1`) —
  required for `avm`/symlink creation to work at all. Keep this on.
- Project data physically lives at `C:\Users\w11\AVS-data`, with an NTFS
  **junction** at `C:\Users\w11\Documents\VisualStudio\AVS` pointing to it
  (`mklink /J`). Both paths work identically for any tool. (This was set up
  while investigating the validator issue; ended up not being the root
  cause, but there's no reason to revert it.)

## Quick reference

| Task | Works natively? | How |
|---|---|---|
| Compile contracts | ✅ | `cargo build-sbf` per program (`make build`) |
| Generate IDL | ✅ | `anchor idl build` (`make idl`) |
| Local validator / ER / QFS | ❌ | Not available on Windows — use Devnet instead |
| Deploy to devnet/testnet | ✅ | `anchor deploy --provider.cluster devnet` |
| Frontend (Next.js) | ✅ | Normal `npm run dev` |
