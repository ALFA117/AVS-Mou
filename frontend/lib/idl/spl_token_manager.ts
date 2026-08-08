/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/spl_token_manager.json`.
 */
export type SplTokenManager = {
  "address": "fNkSCkp2szKMND8ouKwfxNpGqhAsnCdQ4PTzsxnDKa3",
  "metadata": {
    "name": "splTokenManager",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "AVS equity SPL token creation, gasless ER transfers between syndicate members, and L1 settlement"
  },
  "instructions": [
    {
      "name": "createSyndicate",
      "docs": [
        "Creates the equity mint for a revealed deal. `deal` is the",
        "sealed-auction Deal PDA's address, used only to derive this",
        "program's Syndicate PDA — no CPI back into sealed-auction."
      ],
      "discriminator": [
        137,
        79,
        44,
        227,
        183,
        126,
        153,
        208
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true
        },
        {
          "name": "syndicate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  121,
                  110,
                  100,
                  105,
                  99,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "deal"
              }
            ]
          }
        },
        {
          "name": "equityMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "deal",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "delegateEquityAccount",
      "docs": [
        "Delegates a member's equity ATA to the ER so subsequent",
        "`transfer_equity` calls against it are gasless when sent to the ER RPC."
      ],
      "discriminator": [
        56,
        55,
        223,
        70,
        6,
        101,
        74,
        6
      ],
      "accounts": [
        {
          "name": "member",
          "writable": true,
          "signer": true
        },
        {
          "name": "equityMint"
        },
        {
          "name": "syndicate",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  121,
                  110,
                  100,
                  105,
                  99,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "syndicate.deal",
                "account": "syndicate"
              }
            ]
          }
        },
        {
          "name": "memberEquityEphemeralAta",
          "writable": true
        },
        {
          "name": "memberEquityEataBuffer",
          "writable": true
        },
        {
          "name": "memberEquityEataRecord",
          "writable": true
        },
        {
          "name": "memberEquityEataMetadata",
          "writable": true
        },
        {
          "name": "ephemeralTokenProgram",
          "address": "SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "mintEquity",
      "docs": [
        "Mints `amount` equity tokens to `member`'s associated token account.",
        "Startup-authorized only — see programs/spl-token-manager/README.md",
        "for the trust boundary (this doesn't verify the amount against",
        "sealed-auction's on-chain `BidSettled` record)."
      ],
      "discriminator": [
        125,
        224,
        160,
        78,
        223,
        11,
        121,
        46
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true,
          "relations": [
            "syndicate"
          ]
        },
        {
          "name": "member"
        },
        {
          "name": "syndicate",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  121,
                  110,
                  100,
                  105,
                  99,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "syndicate.deal",
                "account": "syndicate"
              }
            ]
          }
        },
        {
          "name": "equityMint",
          "writable": true
        },
        {
          "name": "memberEquityAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "member"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "equityMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "baseAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                181,
                183,
                0,
                225,
                242,
                87,
                58,
                192,
                204,
                6,
                34,
                1,
                52,
                74,
                207,
                151,
                184,
                53,
                6,
                235,
                140,
                229,
                25,
                152,
                204,
                98,
                126,
                24,
                147,
                128,
                167,
                62
              ]
            }
          }
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "transferEquity",
      "docs": [
        "Plain SPL transfer between two equity token accounts. Identical",
        "whether both are still on L1 or have been delegated to the ER —",
        "\"gasless\" comes from sending this transaction to the ER RPC against",
        "delegated accounts, not from anything special in this instruction",
        "(mirrors the upstream `spl-tokens` example exactly)."
      ],
      "discriminator": [
        131,
        184,
        158,
        244,
        122,
        44,
        171,
        48
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "from",
          "writable": true
        },
        {
          "name": "to",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "undelegateEquityAccount",
      "docs": [
        "Commits a delegated equity account's ER state back to L1."
      ],
      "discriminator": [
        146,
        222,
        101,
        93,
        156,
        160,
        63,
        7
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "equityAccount",
          "writable": true
        },
        {
          "name": "magicContext",
          "writable": true
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "syndicate",
      "discriminator": [
        176,
        41,
        35,
        51,
        97,
        147,
        73,
        182
      ]
    }
  ],
  "events": [
    {
      "name": "equityMinted",
      "discriminator": [
        191,
        34,
        200,
        59,
        222,
        234,
        140,
        244
      ]
    },
    {
      "name": "equityTransferred",
      "discriminator": [
        120,
        101,
        220,
        57,
        84,
        164,
        79,
        209
      ]
    },
    {
      "name": "settlementComplete",
      "discriminator": [
        77,
        217,
        230,
        95,
        39,
        177,
        123,
        104
      ]
    },
    {
      "name": "syndicateCreated",
      "discriminator": [
        221,
        135,
        74,
        181,
        16,
        84,
        157,
        40
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "amount must be > 0"
    },
    {
      "code": 6001,
      "name": "invalidTokenOwner",
      "msg": "token account is not owned by the expected authority"
    },
    {
      "code": 6002,
      "name": "mintMismatch",
      "msg": "token account mint mismatch"
    },
    {
      "code": 6003,
      "name": "invalidEphemeralAta",
      "msg": "invalid ephemeral token account PDA"
    },
    {
      "code": 6004,
      "name": "mathOverflow",
      "msg": "arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "equityMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "syndicate",
            "type": "pubkey"
          },
          {
            "name": "member",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "equityTransferred",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "settlementComplete",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "equityAccount",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "syndicate",
      "docs": [
        "One per sealed-auction Deal, created after that deal reveals. Owns the",
        "mint authority for the deal's equity token."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "docs": [
              "Informational link to the sealed-auction Deal PDA. Not CPI-verified —",
              "see programs/spl-token-manager/README.md."
            ],
            "type": "pubkey"
          },
          {
            "name": "startup",
            "type": "pubkey"
          },
          {
            "name": "equityMint",
            "type": "pubkey"
          },
          {
            "name": "memberCount",
            "type": "u8"
          },
          {
            "name": "totalMinted",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "syndicateCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "syndicate",
            "type": "pubkey"
          },
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "startup",
            "type": "pubkey"
          },
          {
            "name": "equityMint",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
