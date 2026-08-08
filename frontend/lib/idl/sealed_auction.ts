/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sealed_auction.json`.
 */
export type SealedAuction = {
  "address": "Bycx3bB2yrFMYWSvi2Yjxutrt1QoVuYyzn37T6ys9YYo",
  "metadata": {
    "name": "sealedAuction",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "AVS sealed-bid deal auction: startups post deals, angels place private bids, equity is distributed proportionally at reveal"
  },
  "instructions": [
    {
      "name": "delegateDeal",
      "discriminator": [
        209,
        218,
        229,
        28,
        4,
        73,
        100,
        87
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferDeal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
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
                "path": "deal"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                163,
                22,
                10,
                211,
                83,
                219,
                213,
                179,
                133,
                35,
                20,
                180,
                38,
                123,
                79,
                45,
                196,
                215,
                151,
                94,
                6,
                220,
                39,
                30,
                0,
                160,
                33,
                101,
                141,
                16,
                94,
                48
              ]
            }
          }
        },
        {
          "name": "delegationRecordDeal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataDeal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "startup"
              },
              {
                "kind": "arg",
                "path": "dealId"
              }
            ]
          }
        },
        {
          "name": "validator",
          "optional": true
        },
        {
          "name": "ownerProgram",
          "address": "Bycx3bB2yrFMYWSvi2Yjxutrt1QoVuYyzn37T6ys9YYo"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "dealId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initBidPermission",
      "discriminator": [
        36,
        217,
        208,
        192,
        111,
        156,
        135,
        147
      ],
      "accounts": [
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "deal.startup",
                "account": "deal"
              },
              {
                "kind": "account",
                "path": "deal.deal_id",
                "account": "deal"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              },
              {
                "kind": "account",
                "path": "bid.bidder",
                "account": "bid"
              }
            ]
          }
        },
        {
          "name": "bidPermission",
          "writable": true
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "ephemeralVault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "dealId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initDealPermission",
      "discriminator": [
        13,
        181,
        152,
        148,
        5,
        5,
        51,
        88
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true,
          "relations": [
            "deal"
          ]
        },
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "startup"
              },
              {
                "kind": "arg",
                "path": "dealId"
              }
            ]
          }
        },
        {
          "name": "permission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  114,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                136,
                161,
                10,
                196,
                33,
                152,
                1,
                214,
                246,
                106,
                29,
                60,
                6,
                152,
                192,
                102,
                169,
                175,
                212,
                217,
                180,
                252,
                231,
                71,
                151,
                141,
                209,
                5,
                168,
                212,
                103,
                82
              ]
            }
          }
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "ephemeralVault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "dealId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeDeal",
      "discriminator": [
        100,
        154,
        180,
        148,
        120,
        1,
        196,
        122
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true
        },
        {
          "name": "fundingMint"
        },
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "startup"
              },
              {
                "kind": "arg",
                "path": "dealId"
              }
            ]
          }
        },
        {
          "name": "dealFundingAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "deal"
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
                "path": "fundingMint"
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
          "name": "dealFundingEphemeralAta",
          "writable": true
        },
        {
          "name": "dealFundingEataBuffer",
          "writable": true
        },
        {
          "name": "dealFundingEataRecord",
          "writable": true
        },
        {
          "name": "dealFundingEataMetadata",
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
          "name": "dealId",
          "type": "u64"
        },
        {
          "name": "valuation",
          "type": "u64"
        },
        {
          "name": "equityBps",
          "type": "u16"
        },
        {
          "name": "minInvestment",
          "type": "u64"
        },
        {
          "name": "maxCap",
          "type": "u64"
        },
        {
          "name": "deadlineTs",
          "type": "i64"
        },
        {
          "name": "cliffMonths",
          "type": "u16"
        },
        {
          "name": "vestingMonths",
          "type": "u16"
        },
        {
          "name": "sponsorLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeBid",
      "docs": [
        "Place a sealed bid. The amount is stored on an ER-only (`eph`) account",
        "sponsored by the deal; nothing about the amount is ever logged or",
        "emitted here, so it stays invisible until `settle_bid` runs post-reveal.",
        "",
        "`investor` is the real wallet this bid belongs to. `bidder` (the",
        "signer) must either *be* `investor` directly, or hold a valid,",
        "unexpired session token authorizing it to sign for `investor` — see",
        "the module docs and `docs/SESSION_KEYS.md`. The `session_token`",
        "account's PDA seeds (checked via the `#[account(seeds = ...)]`",
        "constraint below) already prove it was minted for exactly this",
        "(program, bidder, investor) triple; only expiry needs a runtime check."
      ],
      "discriminator": [
        238,
        77,
        148,
        91,
        200,
        151,
        92,
        146
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "bidder",
          "docs": [
            "The real investor wallet directly, or a session signer authorized",
            "for it — validated against `session_token` in `place_bid`."
          ],
          "signer": true
        },
        {
          "name": "sessionToken",
          "docs": [
            "Its PDA seeds bind it to exactly this (program, bidder, investor)",
            "triple — see `docs/SESSION_KEYS.md`. Anchor's `seeds`/`bump`",
            "constraint rejects the account entirely if it doesn't match, so",
            "`place_bid` only needs to check expiry at runtime."
          ],
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  50
                ]
              },
              {
                "kind": "const",
                "value": [
                  163,
                  22,
                  10,
                  211,
                  83,
                  219,
                  213,
                  179,
                  133,
                  35,
                  20,
                  180,
                  38,
                  123,
                  79,
                  45,
                  196,
                  215,
                  151,
                  94,
                  6,
                  220,
                  39,
                  30,
                  0,
                  160,
                  33,
                  101,
                  141,
                  16,
                  94,
                  48
                ]
              },
              {
                "kind": "account",
                "path": "bidder"
              },
              {
                "kind": "arg",
                "path": "investor"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                4,
                199,
                102,
                62,
                122,
                205,
                171,
                45,
                147,
                4,
                60,
                163,
                78,
                136,
                108,
                183,
                60,
                169,
                145,
                142,
                174,
                255,
                137,
                190,
                131,
                177,
                160,
                119,
                240,
                149,
                183,
                134
              ]
            }
          }
        },
        {
          "name": "fundingMint"
        },
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "deal.startup",
                "account": "deal"
              },
              {
                "kind": "account",
                "path": "deal.deal_id",
                "account": "deal"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "bidderFundingAccount",
          "writable": true
        },
        {
          "name": "dealFundingAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "vault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "dealId",
          "type": "u64"
        },
        {
          "name": "investor",
          "type": "pubkey"
        },
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
      "name": "revealDeal",
      "docs": [
        "The reveal: after the deadline, scan every bid account (now readable",
        "since we're past the deadline the permission model gates on) and sum",
        "them. No single \"winner\" — every accepted bid becomes a syndicate",
        "position, sized in `settle_bid`."
      ],
      "discriminator": [
        67,
        59,
        63,
        122,
        163,
        23,
        200,
        203
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true,
          "relations": [
            "deal"
          ]
        },
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "deal.startup",
                "account": "deal"
              },
              {
                "kind": "arg",
                "path": "dealId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "dealId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleBid",
      "docs": [
        "Runs once per bid after reveal: computes that bidder's proportional",
        "equity share, forwards their payment to the startup, and closes the",
        "(now-settled) sealed bid account. No refunds — every accepted bid",
        "becomes a syndicate position, sized by its share of `total_raised`."
      ],
      "discriminator": [
        39,
        141,
        108,
        215,
        181,
        98,
        229,
        171
      ],
      "accounts": [
        {
          "name": "bidder"
        },
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "deal.startup",
                "account": "deal"
              },
              {
                "kind": "account",
                "path": "deal.deal_id",
                "account": "deal"
              }
            ]
          }
        },
        {
          "name": "bid",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  105,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "deal"
              },
              {
                "kind": "account",
                "path": "bidder"
              }
            ]
          }
        },
        {
          "name": "fundingMint"
        },
        {
          "name": "dealFundingAccount",
          "writable": true
        },
        {
          "name": "startupFundingAccount",
          "writable": true
        },
        {
          "name": "bidPermission",
          "writable": true
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "vault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        }
      ],
      "args": []
    },
    {
      "name": "undelegateDeal",
      "discriminator": [
        92,
        22,
        40,
        56,
        186,
        37,
        249,
        196
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "deal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "deal.startup",
                "account": "deal"
              },
              {
                "kind": "arg",
                "path": "dealId"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "dealId",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bid",
      "discriminator": [
        143,
        246,
        48,
        245,
        42,
        145,
        180,
        88
      ]
    },
    {
      "name": "deal",
      "discriminator": [
        125,
        223,
        160,
        234,
        71,
        162,
        182,
        219
      ]
    }
  ],
  "events": [
    {
      "name": "bidPlaced",
      "discriminator": [
        135,
        53,
        176,
        83,
        193,
        69,
        108,
        61
      ]
    },
    {
      "name": "bidSettled",
      "discriminator": [
        234,
        32,
        141,
        114,
        0,
        102,
        0,
        139
      ]
    },
    {
      "name": "dealCreated",
      "discriminator": [
        27,
        18,
        50,
        52,
        104,
        175,
        46,
        101
      ]
    },
    {
      "name": "dealRevealed",
      "discriminator": [
        134,
        64,
        209,
        108,
        5,
        176,
        109,
        212
      ]
    },
    {
      "name": "dealSettled",
      "discriminator": [
        41,
        213,
        235,
        64,
        55,
        168,
        51,
        76
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "amount must be greater than zero"
    },
    {
      "code": 6001,
      "name": "belowMinInvestment",
      "msg": "bid is below the deal's minimum investment"
    },
    {
      "code": 6002,
      "name": "invalidEquityBps",
      "msg": "equity_bps must be between 1 and 10_000"
    },
    {
      "code": 6003,
      "name": "deadlineInPast",
      "msg": "deadline must be in the future"
    },
    {
      "code": 6004,
      "name": "dealStillOpen",
      "msg": "deal deadline has not passed"
    },
    {
      "code": 6005,
      "name": "dealClosed",
      "msg": "deal is not open"
    },
    {
      "code": 6006,
      "name": "dealNotRevealed",
      "msg": "deal has not been revealed yet"
    },
    {
      "code": 6007,
      "name": "tooManyBidders",
      "msg": "too many bidders"
    },
    {
      "code": 6008,
      "name": "missingBid",
      "msg": "missing bid account"
    },
    {
      "code": 6009,
      "name": "invalidBid",
      "msg": "invalid bid account"
    },
    {
      "code": 6010,
      "name": "invalidTokenOwner",
      "msg": "token account is not owned by the expected authority"
    },
    {
      "code": 6011,
      "name": "mintMismatch",
      "msg": "token account mint mismatch"
    },
    {
      "code": 6012,
      "name": "invalidBidEscrow",
      "msg": "invalid bid escrow account"
    },
    {
      "code": 6013,
      "name": "duplicateBid",
      "msg": "duplicate bid account"
    },
    {
      "code": 6014,
      "name": "unsettledBids",
      "msg": "not all bid accounts are settled"
    },
    {
      "code": 6015,
      "name": "equityMathOverflow",
      "msg": "arithmetic overflow computing equity allocation"
    },
    {
      "code": 6016,
      "name": "bidAlreadySettled",
      "msg": "bid has already been settled"
    },
    {
      "code": 6017,
      "name": "invalidSession",
      "msg": "signer is neither the investor nor a valid, unexpired session for them"
    }
  ],
  "types": [
    {
      "name": "bid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "bidderIndex",
            "type": "u8"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "equityAllocated",
            "docs": [
              "Equity tokens allocated to this bidder, computed once during `reveal_deal`",
              "as `amount / total_raised * equity_bps / 10_000 * EQUITY_TOTAL_SUPPLY`."
            ],
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
      "name": "bidPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "bidderIndex",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bidSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "equityAllocated",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "deal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "startup",
            "docs": [
              "Startup founder who posted the deal and receives funding-token proceeds."
            ],
            "type": "pubkey"
          },
          {
            "name": "dealId",
            "type": "u64"
          },
          {
            "name": "fundingMint",
            "docs": [
              "Token bidders pay with (e.g. a devnet USDC mint)."
            ],
            "type": "pubkey"
          },
          {
            "name": "valuation",
            "docs": [
              "Startup's declared valuation, in funding-token smallest units. Informational."
            ],
            "type": "u64"
          },
          {
            "name": "equityBps",
            "docs": [
              "Share of the company being offered in this round, in basis points (0-10_000)."
            ],
            "type": "u16"
          },
          {
            "name": "minInvestment",
            "type": "u64"
          },
          {
            "name": "maxCap",
            "docs": [
              "Soft raise target. Not enforced on-chain; surfaced for the frontend and to",
              "flag oversubscription at reveal (see `Deal.oversubscribed`)."
            ],
            "type": "u64"
          },
          {
            "name": "deadlineTs",
            "type": "i64"
          },
          {
            "name": "bidCount",
            "type": "u8"
          },
          {
            "name": "closedBidCount",
            "type": "u8"
          },
          {
            "name": "totalRaised",
            "docs": [
              "Sum of all accepted bid amounts. Zero until `reveal_deal` runs."
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "dealStatus"
              }
            }
          },
          {
            "name": "oversubscribed",
            "type": "bool"
          },
          {
            "name": "cliffMonths",
            "docs": [
              "Cliff before vesting starts, in months. Informational for MVP — on-chain",
              "vesting enforcement is out of scope (see programs/sealed-auction README)."
            ],
            "type": "u16"
          },
          {
            "name": "vestingMonths",
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "dealCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "startup",
            "type": "pubkey"
          },
          {
            "name": "dealId",
            "type": "u64"
          },
          {
            "name": "equityBps",
            "type": "u16"
          },
          {
            "name": "minInvestment",
            "type": "u64"
          },
          {
            "name": "maxCap",
            "type": "u64"
          },
          {
            "name": "deadlineTs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "dealRevealed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "bidCount",
            "type": "u8"
          },
          {
            "name": "totalRaised",
            "type": "u64"
          },
          {
            "name": "oversubscribed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "dealSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "totalRaised",
            "type": "u64"
          },
          {
            "name": "bidCount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "dealStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "revealed"
          },
          {
            "name": "settled"
          }
        ]
      }
    },
    {
      "name": "sessionTokenV2",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "targetProgram",
            "type": "pubkey"
          },
          {
            "name": "sessionSigner",
            "type": "pubkey"
          },
          {
            "name": "feePayer",
            "type": "pubkey"
          },
          {
            "name": "validUntil",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
