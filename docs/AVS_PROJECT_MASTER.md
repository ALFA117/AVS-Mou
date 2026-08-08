# 🔐 ANONYMOUS VENTURE SYNDICATE (AVS)
## Project Master Document

**Project Lead**: ALFA_EDG  
**Duration**: 6 Days (Aug 3-9, 2026)  
**Target**: Solana Blitz V7 Hackathon - Collaboration Track  
**Prize Goal**: 🥇 First Place ($500 USDC)

---

# 📋 PROMPT MAESTRO DEL PROYECTO

```
ERES UN INGENIERO WEB3 SENIOR ESPECIALIZADO EN SOLANA Y MAGICBLOCK.

PROYECTO: Anonymous Venture Syndicate (AVS)
Una plataforma donde ángeles inversionistas pueden colocar dinero en 
deals de startups de forma COMPLETAMENTE PRIVADA.

CONTEXTO:
- Los inversores ángeles quieren invertir en secreto (sin que competidores vean)
- Las subastas de deals deben ser "sealed-bid" (nadie sabe cuánto puso el otro)
- El reveal debe ser instantáneo y verificable
- Todo sucede en 10ms (Ephemeral Rollup de MagicBlock)
- Settlement final en Solana L1

FUNCIONALIDAD CORE:
1. Startup postea deal (términos ENCRIPTADOS)
2. Ángeles ven deal, colocan bids SECRETOS (sin que otros vean)
3. Al cierre: REVEAL simultáneo (todos ven quiénes ganaron qué)
4. Distribución de equity tokens (proporcional a bid)
5. Votación privada en milestones (binary predictions)
6. Rewards distribution (VRF = fairness)

STACK TECH:
- Anchor + Rust (Smart Contracts)
- Next.js + TypeScript (Frontend)
- MagicBlock ER (Execution)
- Session Keys (Auto-auth)
- SPL Tokens (Equity transfer)
- Sealed Auction + VRF (Privacy + Randomness)

REQUISITOS DE JUECES:
✅ Integración COMPLETA de Ephemeral Rollup
✅ Uso de 3+ features de MagicBlock
✅ Creatividad + Profundidad técnica
✅ Demo funcional end-to-end
✅ Soluciona problema real

TU TAREA:
Eres el arquitecto del proyecto. Tu trabajo es asegurar que cada componente:
- Sea implementable en 6 días
- Reutilice ejemplos de magicblock-engine-examples
- Sea demostrablemente privado
- Sea técnicamente hermoso

NO CORTES ESQUINAS. Calidad > Velocidad.
```

---

# 🎯 OBJETIVOS DEL PROYECTO

## Objetivo Primario
**Ganar el primer lugar del Solana Blitz V7 Hackathon** demostrando:
- Uso innovador de Ephemeral Rollups para privacidad en venture financing
- Implementación completa de sealed-bid auctions con settlement inmediato
- Colaboración trustless entre inversionistas anónimos

## Objetivos Secundarios
1. **Demostración Técnica**: Showcase de 3+ features MagicBlock en producción
2. **Experiencia de Usuario**: UI intuitiva para inversores no-técnicos
3. **Seguridad**: Zero conocimiento hasta reveal (verificable cryptográficamente)
4. **Escalabilidad**: Arquitectura lista para 100+ syndicates simultáneos

## Objetivos de Alcance
- MVP funcional: Startup postea deal → Ángeles pujan → Reveal → Settlement
- Testnet deployment completo (no solo local)
- Video demo de 2-3 minutos mostrando flujo completo
- Documentación técnica clara para judges

---

# 📊 REQUERIMIENTOS DEL SISTEMA

## Requerimientos Funcionales (RF)

### RF-001: Deal Management
- [ ] Startup puede crear deal con términos (vesting, valuation, equity %)
- [ ] Deal terms se guardan ENCRIPTADOS en ER
- [ ] Deal tiene fecha de cierre (countdown visible)
- [ ] Deal muestra: min investment, max cap, current deadline

### RF-002: Sealed Bidding
- [ ] Ángel ve deal y coloca bid en SOL/USDC
- [ ] Bid se ENCRIPTA antes de enviar (no visible en blockchain)
- [ ] Session Key auto-firma (no popup de wallet)
- [ ] Bid se almacena en ER, no en L1
- [ ] Ángel puede cambiar bid antes de deadline

### RF-003: Reveal & Settlement
- [ ] Al cierre, bids se DECRYPT de forma simultánea
- [ ] Top X bidders quedan en syndicate
- [ ] Smart contract calcula equity distribution
- [ ] SPL tokens se transfieren a wallet de cada inversor
- [ ] Transacciones son GASLESS (0 SOL fee)

### RF-004: Private Voting
- [ ] Syndicate members pueden votar en milestones (private)
- [ ] Votos se ENCRIPTAN (binary prediction: sí/no)
- [ ] Reveal simultáneo (todos ven resultado al mismo tiempo)
- [ ] Recompensas se distribuyen vía VRF (fairness)

### RF-005: Syndicate Management
- [ ] Panel para ver posición de cada miembro (private)
- [ ] Chat grupal encriptado (ephemeral accounts)
- [ ] Historial de votaciones (auditable)
- [ ] Interfaz para transferir tokens entre miembros

### RF-006: Analytics & Transparency
- [ ] Dashboard público: total deals, total invested, avg returns
- [ ] Dashboard privado (solo signers): posiciones individuales
- [ ] Leaderboard anónimo (por earnings, no por nombre)

---

## Requerimientos No-Funcionales (RNF)

### RNF-001: Performance
- [ ] Bidding confirmation: < 1 segundo
- [ ] Reveal: < 10ms (ER SLA)
- [ ] Settlement: < 5 segundos

### RNF-002: Security
- [ ] Bids encriptados hasta reveal (verificable)
- [ ] No hay way de see bids before deadline (cryptographic proof)
- [ ] Session keys no exponen private keys
- [ ] Auditoría de all transactions en L1

### RNF-003: Scalability
- [ ] Soporta 100+ concurrent deals
- [ ] Soporta 1000+ simultaneous bidders
- [ ] ER auto-scales (MagicBlock feature)

### RNF-004: Availability
- [ ] Uptime: 99.5% durante hackathon
- [ ] Fallback a testnet si ER falla
- [ ] Error handling + user feedback

### RNF-005: Compliance (Nice-to-have)
- [ ] Audit logs (encrypted, stored on L1)
- [ ] Optional KYC hooks (future)

---

# 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Next.js)                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  Deal Feed UI    │  │ Bidding Form     │  │ Syndicate Dash │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘ │
└───────────┼──────────────────────┼──────────────────────┼──────────┘
            │                      │                      │
            └──────────────────────┼──────────────────────┘
                                   │
            ┌──────────────────────┴──────────────────────┐
            │                                             │
┌───────────▼──────────────┐           ┌─────────────────▼────────┐
│  Session Key Integration │           │ Real-time Subscriptions  │
│  (gpl-session)           │           │ (Solana RPC)             │
└───────────┬──────────────┘           └──────────────┬───────────┘
            │                                         │
            └─────────────────────────┬────────────────┘
                                      │
          ┌───────────────────────────▼────────────────────────────┐
          │       EPHEMERAL ROLLUP (MagicBlock ER)                │
          │  (10ms block time, encrypted state)                   │
          │                                                        │
          │  ┌──────────────────────────────────────────────────┐ │
          │  │ Sealed Auction Program (Anchor)                  │ │
          │  │  • Stores encrypted bids                         │ │
          │  │  • Manages bid lifecycle                         │ │
          │  │  • Computes winner distribution                  │ │
          │  └──────────────────────────────────────────────────┘ │
          │                                                        │
          │  ┌──────────────────────────────────────────────────┐ │
          │  │ Private Voting Program (Binary Prediction)        │ │
          │  │  • Stores encrypted votes                        │ │
          │  │  • VRF for reward distribution                   │ │
          │  │  • Milestone tracking                            │ │
          │  └──────────────────────────────────────────────────┘ │
          │                                                        │
          │  ┌──────────────────────────────────────────────────┐ │
          │  │ SPL Token Management (Ephemeral Accounts)        │ │
          │  │  • Equity token creation & distribution          │ │
          │  │  • Inter-syndicate transfers (gasless)           │ │
          │  └──────────────────────────────────────────────────┘ │
          │                                                        │
          │  ┌──────────────────────────────────────────────────┐ │
          │  │ Ephemeral Account Chats (Syndicate comms)        │ │
          │  │  • Private group messaging                       │ │
          │  │  • Encrypted storage                             │ │
          │  └──────────────────────────────────────────────────┘ │
          └───────────┬─────────────────────────────────────────────┘
                      │
          ┌───────────▼──────────────────────────────────┐
          │   Query Filtering Service (QFS)             │
          │   (Privacy layer, mirrors TEE logic)        │
          │   • Encrypts bids before ER storage         │
          │   • Manages reveal timing                   │
          └───────────┬──────────────────────────────────┘
                      │
          ┌───────────▼──────────────────────────────────┐
          │     SOLANA L1 (Settlement & Finality)       │
          │                                             │
          │  • Finalize equity distributions           │
          │  • Mint compliance/audit logs              │
          │  • Settle treasury (if fees apply)         │
          └─────────────────────────────────────────────┘
```

---

# 💎 FUNCIONALIDADES CORE

## Funcionalidad #1: Deal Posting
**Actor**: Startup founder  
**Entrada**: Deal terms (name, valuation, equity %, vesting schedule)  
**Proceso**:
1. Founder conecta wallet (Session Key)
2. Completa form con detalles
3. Smart contract encripta términos
4. Deal se publica en ER
5. Genera unique deal ID + QR code

**Salida**: Deal visible para ángeles, términos PRIVADOS

---

## Funcionalidad #2: Bid Submission
**Actor**: Angel investor  
**Entrada**: Deal ID + amount (SOL/USDC)  
**Proceso**:
1. Ángel clickea "Place Bid"
2. Ingresa cantidad (sin ver otros bids)
3. Session Key auto-firma (0 popups)
4. Bid se encripta antes de enviar
5. Confirmación: "Bid received. Waiting for reveal."

**Salida**: Bid almacenado en ER, invisible hasta deadline

---

## Funcionalidad #3: Reveal & Settlement
**Actor**: Smart contract (automated)  
**Entrada**: Deadline reached  
**Proceso**:
1. ER inicia reveal phase (mismo block)
2. Todos los bids se decrypt simultáneamente
3. Smart contract ordena bids (highest first)
4. Calcula equity % para cada ganador
5. Crea SPL tokens (si no existen)
6. Transfiere equity tokens a wallets (GASLESS)
7. Publica resultado en L1 (para finality)

**Salida**: Syndicate formada, equity distribuida

---

## Funcionalidad #4: Private Milestone Voting
**Actor**: Syndicate members  
**Entrada**: Milestone proposal (e.g., "Alcanzar $1M ARR")  
**Proceso**:
1. Startup propone milestone + deadline
2. Miembros votan SÍ/NO (votes encriptados)
3. Session Key auto-firma (no friction)
4. Al vencer: todos los votos se decrypt
5. VRF decide reward distribution (para los que votaron correcto)

**Salida**: Milestone resulto, rewards distribuidas

---

## Funcionalidad #5: Syndicate Chat & Treasury
**Actor**: Syndicate members  
**Entrada**: Mensaje / transfer request  
**Proceso**:
1. Chat privado en ephemeral account (encrypted)
2. Miembros coordinan estrategia
3. Proponen transferencias de equity
4. Firma con session keys (multi-sig)
5. Ejecución instantánea

**Salida**: Comunicación privada + coordinación

---

## Funcionalidad #6: Analytics Dashboard
**Actor**: Público (anonymous) + Owners (private)  
**Entrada**: Ninguna  
**Proceso**:
1. Dashboard público muestra: total deals, $ invested, leaderboards
2. Dashboard privado (login) muestra: mis posiciones, earnings, history

**Salida**: Transparencia anónima (nadie sabe quién es quién)

---

# 🛠️ REQUERIMIENTOS TÉCNICOS

## Backend (Anchor + Rust)

### Smart Contracts Base
- [ ] `sealed_auction.rs` - Subasta sellada (fork de ejemplo MagicBlock)
- [ ] `private_voting.rs` - Binary prediction + VRF
- [ ] `spl_token_manager.rs` - Equity token lifecycle
- [ ] `ephemeral_accounts.rs` - Syndicate account management

### Libraries & Integrations
- [ ] `anchor-lang` (v0.31+)
- [ ] `solana-program` (v1.18+)
- [ ] `spl-token` (equity transfer)
- [ ] `gpl-session-keys` (delegated signing)
- [ ] `orao-solana-vrf` (verifiable randomness)
- [ ] `getrandom` (encryption)

### Key Smart Contract Features
- [ ] Bid encryption/decryption (Ed25519)
- [ ] Time-lock for reveals
- [ ] Proportional distribution algorithm
- [ ] VRF integration for rewards
- [ ] Multi-signature on epoch transitions

---

## Frontend (Next.js + TypeScript)

### Pages & Components
- [ ] `/deals` - Deal feed (public view)
- [ ] `/deals/[id]` - Deal detail + bid form
- [ ] `/dashboard` - Personal syndicate positions
- [ ] `/vote` - Milestone voting interface
- [ ] `/chat` - Syndicate chat (ephemeral)
- [ ] `/analytics` - Public stats + leaderboards

### Libraries
- [ ] `next.js` (14+)
- [ ] `react` (18+)
- [ ] `@solana/web3.js` (1.78+)
- [ ] `@solana/wallet-adapter-react`
- [ ] `@gpl-session-keys/sdk` (session key integration)
- [ ] `axios` (API calls)
- [ ] `zustand` (state management)
- [ ] `framer-motion` (animations)
- [ ] `recharts` (analytics charts)
- [ ] `tailwindcss` (styling)

### Key Frontend Features
- [ ] Real-time countdown timers
- [ ] Bid submission form (no wallet popups with session keys)
- [ ] Reveal animation (card flip effect)
- [ ] Live leaderboard updates
- [ ] Encrypted chat interface
- [ ] Charts (deal pipeline, winrate, avg bid)

---

## Infrastructure

### Local Development
- [ ] Solana Test Validator (preloaded with MagicBlock programs)
- [ ] Ephemeral Rollup instance
- [ ] Query Filtering Service (QFS) for privacy simulation

### Testnet Deployment
- [ ] Devnet → Testnet pipeline (CI/CD)
- [ ] Anchor IDL generation
- [ ] Program deployment scripts

### Mainnet Ready (Not for hackathon, but structure for it)
- [ ] Program audit checklist
- [ ] Multi-sig initialization
- [ ] Emergency pause mechanism

---

# 🎬 FUNCIONALIDADES EDGE CASES & FUTUROS

## Nice-to-Have (If Time Allows)
1. **Fractional Bidding** - Ángel puede poner múltiples bids pequeños (anónimo)
2. **Secondary Market** - Tradear equity entre syndicates
3. **Insurance Pool** - Si startup falla, syndicate members reciben seguro
4. **Governance Token** - AVS token para votar sobre fee structure
5. **Fiat Ramps** - Integración con Stripe para no-crypto users
6. **Mobile App** - React Native version

## Futuro Post-Hackathon
1. Mainnet deployment
2. Real investor onboarding
3. Legal wrapper (accredited investor check)
4. Secondary market liquidity
5. Multi-chain expansion (Arbitrum, Optimism)

---

# 📅 TIMELINE ALTA PRECISIÓN

```
DAY 1 (Aug 3)
├─ 0-2h: Setup + Repo
├─ 2-4h: Spec review + Architecture review
├─ 4-8h: Backend scaffolding
└─ 8-12h: Initial contract stubs

DAY 2 (Aug 4)
├─ 0-4h: Core contracts (sealed auction)
├─ 4-8h: SPL token integration
├─ 8-12h: Session keys integration + testing

DAY 3 (Aug 5)
├─ 0-4h: VRF + private voting
├─ 4-8h: Frontend scaffolding (Next.js)
├─ 8-12h: Deal feed + bid form UI

DAY 4 (Aug 6)
├─ 0-4h: Reveal animation + settlement UI
├─ 4-8h: Dashboard + analytics
├─ 8-12h: Chat + syndicate management

DAY 5 (Aug 7)
├─ 0-8h: Integration testing (e2e)
├─ 8-12h: Performance optimization + bug fixes

DAY 6 (Aug 8)
├─ 0-4h: Demo prep + recording
├─ 4-8h: Documentation + README
├─ 8-12h: Final deployment + testing

DAY 7 (Aug 9)
└─ 0-12h: SUBMISSION DAY (backup + troubleshooting)
```

---

# ✅ DEFINICIÓN DE DONE

### MVP Completo = ✅
- [ ] Startup postea deal (términos encriptados)
- [ ] Ángel coloca bid (sin ver otros)
- [ ] Reveal simultáneo (todos ven resultado)
- [ ] Equity tokens transferidos (gasless)
- [ ] Syndicate puede votar (private)
- [ ] Demo end-to-end funciona (sin errores)

### Submission Completo = ✅
- [ ] Código en GitHub (public)
- [ ] Smart contracts deployados (testnet)
- [ ] Frontend deployed (Vercel o similar)
- [ ] Video demo (2-3 min)
- [ ] README técnico
- [ ] Présentation deck (5-7 slides)

---

# 🎥 DEMO SCRIPT (2 MIN)

```
[00-30s] "Problema: Angel investors want privacy"
└─ Show screenshot: AngelList leak (everyone sees investments)

[30-60s] "Solution: Anonymous Venture Syndicate"
└─ Show deal posted (encrypted terms)

[60-90s] "Ángeles ponen dinero en secreto"
└─ Demo: 3 ángeles submitting bids (amounts hidden)

[90-120s] "Reveal: Winner takes all (proportional)"
└─ Animation: Bids decrypt, winners highlighted
└─ Show tokens transferred to wallets

[Finish] "Built on MagicBlock: 10ms latency, $0 fees, private by default"
```

---

# 🚀 STACK FINAL (COPY-PASTE READY)

```bash
# Backend
- anchor-lang ^0.31.0
- solana-program ^1.18.0
- spl-token ^4.0.0
- orao-solana-vrf ^0.13.0
- getrandom (for encryption)

# Frontend
- next@14
- react@18
- @solana/web3.js@1.78
- @solana/wallet-adapter-react@0.15
- zustand@4.4
- tailwindcss@3.3
- recharts@2.10
- framer-motion@10.16

# Testing
- anchor-test (built-in)
- vitest
- @testing-library/react

# Deployment
- Vercel (frontend)
- GitHub (repo)
- Solana Testnet (contracts)

# Dev Tools
- Anchor CLI ^0.31.0
- Rust 1.75+
- Node 18+
```

---

# 📞 CONTACTOS & RECURSOS

## MagicBlock Resources
- Docs: https://docs.magicblock.gg/
- Examples: https://github.com/magicblock-labs/magicblock-engine-examples
- Discord: https://t.me/+78KHQkUsy0ViMzQ6
- Testnet Faucet: [ask in Discord]

## Solana Resources
- Solana Docs: https://docs.solana.com/
- Anchor Book: https://book.anchor-lang.com/
- SPL Token: https://spl.solana.com/token

---

**Project Status**: 🔄 IN DEVELOPMENT  
**Last Updated**: August 3, 2026  
**Next Review**: Daily standup at 10 AM MX time
