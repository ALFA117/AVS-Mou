/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/private_voting.json`.
 */
export type PrivateVoting = {
  "address": "ErRYzAmuTFGHQSzZ7A38zX2rmwosGxDYTvPtPCSPq4Qs",
  "metadata": {
    "name": "privateVoting",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "AVS private milestone voting: syndicate members cast sealed YES/NO votes, revealed simultaneously, rewards distributed via VRF"
  },
  "instructions": [
    {
      "name": "castVote",
      "docs": [
        "Cast a sealed YES/NO vote. The choice is stored on an ER-only (`eph`)",
        "account sponsored by the milestone; nothing about the choice is ever",
        "logged or emitted here, so it stays invisible until `reveal_milestone`.",
        "",
        "`member` is the real wallet this vote belongs to. `voter` (the",
        "signer) must either *be* `member` directly, or hold a valid,",
        "unexpired session token authorizing it to sign for `member` — see",
        "`docs/SESSION_KEYS.md`. The `session_token` account's PDA seeds",
        "(checked via the `#[account(seeds = ...)]` constraint below) already",
        "prove it was minted for exactly this (program, voter, member)",
        "triple; only expiry needs a runtime check."
      ],
      "discriminator": [
        20,
        212,
        15,
        189,
        69,
        180,
        69,
        151
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "voter",
          "docs": [
            "The real member wallet directly, or a session signer authorized for",
            "it — validated against `session_token` in `cast_vote`."
          ],
          "signer": true
        },
        {
          "name": "sessionToken",
          "docs": [
            "Its PDA seeds bind it to exactly this (program, voter, member)",
            "triple — see `docs/SESSION_KEYS.md`."
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
                  205,
                  209,
                  38,
                  110,
                  248,
                  80,
                  184,
                  152,
                  165,
                  148,
                  148,
                  177,
                  0,
                  74,
                  254,
                  165,
                  116,
                  46,
                  97,
                  40,
                  4,
                  239,
                  73,
                  147,
                  28,
                  59,
                  116,
                  241,
                  61,
                  161,
                  191,
                  20
                ]
              },
              {
                "kind": "account",
                "path": "voter"
              },
              {
                "kind": "arg",
                "path": "member"
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
          "name": "milestone",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  108,
                  101,
                  115,
                  116,
                  111,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "milestone.startup",
                "account": "milestone"
              },
              {
                "kind": "account",
                "path": "milestone.milestone_id",
                "account": "milestone"
              }
            ]
          }
        },
        {
          "name": "vote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "milestone"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
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
          "name": "milestoneId",
          "type": "u64"
        },
        {
          "name": "member",
          "type": "pubkey"
        },
        {
          "name": "choice",
          "type": {
            "defined": {
              "name": "choice"
            }
          }
        }
      ]
    },
    {
      "name": "delegateMilestone",
      "discriminator": [
        181,
        77,
        149,
        249,
        46,
        200,
        255,
        215
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferMilestone",
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
                "path": "milestone"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                205,
                209,
                38,
                110,
                248,
                80,
                184,
                152,
                165,
                148,
                148,
                177,
                0,
                74,
                254,
                165,
                116,
                46,
                97,
                40,
                4,
                239,
                73,
                147,
                28,
                59,
                116,
                241,
                61,
                161,
                191,
                20
              ]
            }
          }
        },
        {
          "name": "delegationRecordMilestone",
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
                "path": "milestone"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataMilestone",
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
                "path": "milestone"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "milestone",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  108,
                  101,
                  115,
                  116,
                  111,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "startup"
              },
              {
                "kind": "arg",
                "path": "milestoneId"
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
          "address": "ErRYzAmuTFGHQSzZ7A38zX2rmwosGxDYTvPtPCSPq4Qs"
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
          "name": "milestoneId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initMilestonePermission",
      "discriminator": [
        213,
        55,
        108,
        132,
        204,
        148,
        174,
        49
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true,
          "relations": [
            "milestone"
          ]
        },
        {
          "name": "milestone",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  108,
                  101,
                  115,
                  116,
                  111,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "startup"
              },
              {
                "kind": "arg",
                "path": "milestoneId"
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
                "path": "milestone"
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
          "name": "milestoneId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initVotePermission",
      "discriminator": [
        13,
        140,
        45,
        132,
        168,
        201,
        143,
        45
      ],
      "accounts": [
        {
          "name": "milestone",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  108,
                  101,
                  115,
                  116,
                  111,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "milestone.startup",
                "account": "milestone"
              },
              {
                "kind": "account",
                "path": "milestone.milestone_id",
                "account": "milestone"
              }
            ]
          }
        },
        {
          "name": "vote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "milestone"
              },
              {
                "kind": "account",
                "path": "vote.voter",
                "account": "vote"
              }
            ]
          }
        },
        {
          "name": "votePermission",
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
          "name": "milestoneId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeMilestone",
      "discriminator": [
        142,
        73,
        5,
        208,
        226,
        196,
        205,
        113
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true
        },
        {
          "name": "milestone",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  108,
                  101,
                  115,
                  116,
                  111,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "startup"
              },
              {
                "kind": "arg",
                "path": "milestoneId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "milestoneId",
          "type": "u64"
        },
        {
          "name": "deal",
          "type": "pubkey"
        },
        {
          "name": "descriptionHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "deadlineTs",
          "type": "i64"
        },
        {
          "name": "rewardPool",
          "type": "u64"
        },
        {
          "name": "sponsorLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "milestoneRandomnessCallback",
      "discriminator": [
        11,
        0,
        236,
        16,
        21,
        78,
        30,
        144
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "docs": [
            "Scoped VRF identity PDA, bound to this program. Its presence as a signer proves",
            "the callback was issued by the VRF program for this program."
          ],
          "signer": true
        },
        {
          "name": "milestone",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
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
      "name": "requestMilestoneRandomness",
      "docs": [
        "Requests verifiable randomness that gates reward settlement — proof",
        "that payout eligibility wasn't front-run or known in advance."
      ],
      "discriminator": [
        236,
        196,
        253,
        78,
        153,
        143,
        185,
        72
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "milestone",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  108,
                  101,
                  115,
                  116,
                  111,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "milestone.startup",
                "account": "milestone"
              },
              {
                "kind": "arg",
                "path": "milestoneId"
              }
            ]
          }
        },
        {
          "name": "oracleQueue",
          "writable": true
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "milestoneId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "revealMilestone",
      "docs": [
        "The reveal: after the deadline, scan every vote account and tally."
      ],
      "discriminator": [
        116,
        142,
        226,
        108,
        150,
        134,
        53,
        72
      ],
      "accounts": [
        {
          "name": "startup",
          "writable": true,
          "signer": true,
          "relations": [
            "milestone"
          ]
        },
        {
          "name": "milestone",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  108,
                  101,
                  115,
                  116,
                  111,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "milestone.startup",
                "account": "milestone"
              },
              {
                "kind": "arg",
                "path": "milestoneId"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "milestoneId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleVote",
      "docs": [
        "Runs once per vote after reveal + randomness fulfillment: pays out an",
        "even share of `reward_pool` to voters on the winning side (no payout",
        "otherwise), then closes the sealed vote account."
      ],
      "discriminator": [
        28,
        56,
        217,
        57,
        155,
        251,
        104,
        65
      ],
      "accounts": [
        {
          "name": "voter",
          "writable": true
        },
        {
          "name": "milestone",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  108,
                  101,
                  115,
                  116,
                  111,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "milestone.startup",
                "account": "milestone"
              },
              {
                "kind": "account",
                "path": "milestone.milestone_id",
                "account": "milestone"
              }
            ]
          }
        },
        {
          "name": "vote",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "milestone"
              },
              {
                "kind": "account",
                "path": "voter"
              }
            ]
          }
        },
        {
          "name": "votePermission",
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
          "name": "vault",
          "writable": true,
          "address": "MagicVau1t999999999999999999999999999999999"
        }
      ],
      "args": []
    },
    {
      "name": "undelegateMilestone",
      "discriminator": [
        206,
        109,
        243,
        17,
        196,
        60,
        214,
        194
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "milestone",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  108,
                  101,
                  115,
                  116,
                  111,
                  110,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "milestone.startup",
                "account": "milestone"
              },
              {
                "kind": "arg",
                "path": "milestoneId"
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
          "name": "milestoneId",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "milestone",
      "discriminator": [
        38,
        210,
        239,
        177,
        85,
        184,
        10,
        44
      ]
    },
    {
      "name": "vote",
      "discriminator": [
        96,
        91,
        104,
        57,
        145,
        35,
        172,
        155
      ]
    }
  ],
  "events": [
    {
      "name": "milestoneCreated",
      "discriminator": [
        151,
        154,
        159,
        254,
        50,
        174,
        22,
        209
      ]
    },
    {
      "name": "milestoneRevealed",
      "discriminator": [
        79,
        121,
        5,
        14,
        234,
        47,
        91,
        33
      ]
    },
    {
      "name": "milestoneSettled",
      "discriminator": [
        14,
        243,
        90,
        90,
        207,
        201,
        235,
        116
      ]
    },
    {
      "name": "voteCast",
      "discriminator": [
        39,
        53,
        195,
        104,
        188,
        17,
        225,
        213
      ]
    },
    {
      "name": "voteSettled",
      "discriminator": [
        200,
        105,
        231,
        25,
        223,
        154,
        5,
        30
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "deadlineInPast",
      "msg": "deadline must be in the future"
    },
    {
      "code": 6001,
      "name": "milestoneClosed",
      "msg": "milestone is not open"
    },
    {
      "code": 6002,
      "name": "milestoneStillOpen",
      "msg": "milestone voting deadline has not passed"
    },
    {
      "code": 6003,
      "name": "milestoneNotRevealed",
      "msg": "milestone has not been revealed yet"
    },
    {
      "code": 6004,
      "name": "tooManyVoters",
      "msg": "too many voters"
    },
    {
      "code": 6005,
      "name": "missingVote",
      "msg": "missing vote account"
    },
    {
      "code": 6006,
      "name": "invalidVote",
      "msg": "invalid vote account"
    },
    {
      "code": 6007,
      "name": "duplicateVote",
      "msg": "duplicate vote account"
    },
    {
      "code": 6008,
      "name": "unsettledVotes",
      "msg": "not all votes are settled"
    },
    {
      "code": 6009,
      "name": "randomnessNotFulfilled",
      "msg": "VRF randomness has not been fulfilled yet"
    },
    {
      "code": 6010,
      "name": "randomnessAlreadyFulfilled",
      "msg": "randomness has already been fulfilled"
    },
    {
      "code": 6011,
      "name": "rewardMathOverflow",
      "msg": "arithmetic overflow computing reward"
    },
    {
      "code": 6012,
      "name": "invalidSession",
      "msg": "signer is neither the member nor a valid, unexpired session for them"
    }
  ],
  "types": [
    {
      "name": "choice",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "yes"
          },
          {
            "name": "no"
          }
        ]
      }
    },
    {
      "name": "milestone",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "startup",
            "docs": [
              "Startup that proposed the milestone and funds the reward pool."
            ],
            "type": "pubkey"
          },
          {
            "name": "deal",
            "docs": [
              "Informational link to the sealed-auction Deal PDA this syndicate came",
              "from. Not CPI-verified in this MVP — see programs/private-voting/README.md."
            ],
            "type": "pubkey"
          },
          {
            "name": "milestoneId",
            "type": "u64"
          },
          {
            "name": "descriptionHash",
            "docs": [
              "Hash of the off-chain milestone description (e.g. \"Reach $1M ARR\"),",
              "keeps on-chain footprint small while still binding the vote to specific terms."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "deadlineTs",
            "type": "i64"
          },
          {
            "name": "rewardPool",
            "docs": [
              "Lamports set aside at creation time, split evenly among voters who",
              "end up on the winning side of the outcome."
            ],
            "type": "u64"
          },
          {
            "name": "voterCount",
            "type": "u8"
          },
          {
            "name": "closedVoteCount",
            "type": "u8"
          },
          {
            "name": "yesCount",
            "type": "u8"
          },
          {
            "name": "noCount",
            "type": "u8"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "outcome"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "milestoneStatus"
              }
            }
          },
          {
            "name": "randomness",
            "docs": [
              "VRF output, gates reward settlement — see `request_milestone_randomness`."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "randomnessFulfilled",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "milestoneCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "milestone",
            "type": "pubkey"
          },
          {
            "name": "startup",
            "type": "pubkey"
          },
          {
            "name": "deal",
            "type": "pubkey"
          },
          {
            "name": "milestoneId",
            "type": "u64"
          },
          {
            "name": "deadlineTs",
            "type": "i64"
          },
          {
            "name": "rewardPool",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "milestoneRevealed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "milestone",
            "type": "pubkey"
          },
          {
            "name": "yesCount",
            "type": "u8"
          },
          {
            "name": "noCount",
            "type": "u8"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "outcome"
              }
            }
          }
        ]
      }
    },
    {
      "name": "milestoneSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "milestone",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "outcome"
              }
            }
          },
          {
            "name": "yesCount",
            "type": "u8"
          },
          {
            "name": "noCount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "milestoneStatus",
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
      "name": "outcome",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "yes"
          },
          {
            "name": "no"
          },
          {
            "name": "tie"
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
    },
    {
      "name": "vote",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "milestone",
            "type": "pubkey"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "choice",
            "type": {
              "defined": {
                "name": "choice"
              }
            }
          },
          {
            "name": "voterIndex",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteCast",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "milestone",
            "type": "pubkey"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "voterIndex",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "milestone",
            "type": "pubkey"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "votedCorrectly",
            "type": "bool"
          },
          {
            "name": "rewardPaid",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
