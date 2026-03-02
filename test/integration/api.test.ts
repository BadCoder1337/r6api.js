import { describe, test, expect, beforeAll, afterAll, vi } from "vitest"
import { z } from "zod"
import R6API from "../../src/index"

const hasCredentials = !!(process.env.R6_TEST_EMAIL && process.env.R6_TEST_PASSWORD)
const PROFILE_ID = process.env.R6_TEST_PROFILE_ID || "00000000-0000-0000-0000-000000000000"
const dnsServers = process.env.R6_TEST_DNS ? process.env.R6_TEST_DNS.split(",") : undefined

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const is429 = (err: unknown) =>
  err instanceof Error &&
  (err.message.includes("Too many calls per IP address") ||
   err.message.includes("process.exit"))

describe.skipIf(!hasCredentials)("Real API Integration", { sequential: true }, () => {
  let api: R6API
  let rateLimited = false
  const originalExit = process.exit

  beforeAll(() => {
    // fetch.ts calls process.exit(1) on 429; stub it so the error propagates normally
    process.exit = (() => {
      throw new Error("Rate-limited (429): process.exit suppressed in tests")
    }) as any

    api = new R6API({
      email: process.env.R6_TEST_EMAIL,
      password: process.env.R6_TEST_PASSWORD,
      dnsServers,
    })
  })

  afterAll(() => {
    process.exit = originalExit
    api?.destroy()
  })

  const safeCall = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (rateLimited) throw new Error("Skipping: rate-limited by previous request")
    try {
      return await fn()
    } catch (err) {
      if (is429(err)) {
        rateLimited = true
        throw new Error("Rate-limited (429) by Ubisoft API — skipping remaining tests")
      }
      throw err
    }
  }

  const profileSchema = z.object({
    id: z.string(),
    userId: z.string(),
    idOnPlatform: z.string(),
    platform: z.string(),
    username: z.string(),
    avatar: z.object({
      146: z.string().url(),
      256: z.string().url(),
      500: z.string().url(),
    }),
  })

  test("findById returns valid shape", async () => {
    const result = await safeCall(() => api.findById("uplay", PROFILE_ID))
    expect(() => z.array(profileSchema).parse(result)).not.toThrow()
  })

  test("getProgression returns valid shape", async () => {
    await delay(2000)
    const progressionSchema = z.object({
      id: z.string(),
      level: z.number(),
      xp: z.number(),
      lootboxProbability: z.object({
        raw: z.number(),
        percent: z.string(),
      }),
    })

    const result = await safeCall(() => api.getProgression("uplay", PROFILE_ID))
    expect(() => z.array(progressionSchema).parse(result)).not.toThrow()
  })

  test("getRanks returns valid shape", async () => {
    await delay(2000)
    const ranksResultSchema = z.object({
      id: z.string(),
      seasons: z.record(z.object({
        seasonId: z.number(),
        regions: z.record(z.object({
          regionId: z.string(),
          regionName: z.string(),
          boards: z.record(z.object({
            boardId: z.string(),
            boardName: z.string(),
            current: z.object({
              id: z.number(),
              name: z.string(),
              mmr: z.number(),
              icon: z.string(),
            }),
            max: z.object({
              id: z.number(),
              name: z.string(),
              mmr: z.number(),
              icon: z.string(),
            }),
            kills: z.number(),
            deaths: z.number(),
            wins: z.number(),
            losses: z.number(),
          })),
        })),
      })),
    })

    const result = await safeCall(() => api.getRanks("uplay", PROFILE_ID, {
      seasonIds: -1,
      regionIds: "emea",
      boardIds: "pvp_ranked",
    }))
    expect(() => z.array(ranksResultSchema).parse(result)).not.toThrow()
  })

  test("getUserSeasonalv2 returns valid shape", async () => {
    await delay(2000)
    const seasonalSchema = z.object({
      profileId: z.string(),
      platformCrossplay: z.string(),
      seasonId: z.number(),
      boardSlug: z.string(),
      rank: z.object({
        id: z.number(),
        name: z.string(),
        mmr: z.number(),
        icon: z.string(),
        rp: z.number(),
      }),
      maxRank: z.object({
        id: z.number(),
        name: z.string(),
        mmr: z.number(),
        icon: z.string(),
        rp: z.number(),
      }),
      kills: z.number(),
      deaths: z.number(),
      kd: z.number(),
      wins: z.number(),
      losses: z.number(),
      winRate: z.string(),
      abandons: z.number(),
      matches: z.number(),
    })

    const result = await safeCall(() => api.getUserSeasonalv2(PROFILE_ID))
    expect(() => z.array(seasonalSchema).parse(result)).not.toThrow()
  })

  test("getPlaytime returns valid shape", async () => {
    await delay(2000)
    const playtimeSchema = z.object({
      id: z.string(),
      pvp: z.object({
        general: z.number(),
        ranked: z.number(),
        casual: z.number(),
        custom: z.number(),
        other: z.number(),
      }),
      pve: z.object({
        general: z.number(),
      }),
    })

    const result = await safeCall(() => api.getPlaytime("uplay", PROFILE_ID))
    expect(() => z.array(playtimeSchema).parse(result)).not.toThrow()
  })

  test("getStatus returns valid shape", async () => {
    await delay(2000)
    const statusSchema = z.object({
      appId: z.string(),
      name: z.string(),
      spaceId: z.string(),
      mdm: z.string(),
      category: z.string(),
      platform: z.string(),
      status: z.string(),
      maintenance: z.union([z.boolean(), z.null()]),
      impactedFeatures: z.array(z.string()),
    })

    const result = await safeCall(() => api.getStatus())
    expect(() => z.array(statusSchema).parse(result)).not.toThrow()
    expect(result.length).toBeGreaterThan(0)
  })

  test("getNews returns valid shape", async () => {
    await delay(2000)
    const newsSchema = z.object({
      total: z.number(),
      limit: z.number(),
      items: z.array(z.object({
        id: z.string(),
        title: z.string(),
        type: z.string(),
        date: z.string(),
      })),
    })

    const result = await safeCall(() => api.getNews({ limit: 2 }))
    expect(() => newsSchema.parse(result)).not.toThrow()
  })
})
