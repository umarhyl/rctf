import { z } from 'zod/mini'
import { Permissions } from '../../enums'
import { defineRoute } from '../../internal'
import {
  BadAlreadySolvedChallenge,
  BadBody,
  BadChallenge,
  BadEnded,
  BadFlag,
  BadNotStarted,
  BadPerms,
  BadRateLimit,
  BadReplayedRequest,
  BadSignature,
  BadToken,
  BadUnknownUser,
  GoodChallengeScoresV2,
  GoodChallengeSolvesV2,
  GoodChallengesV2,
  GoodDynamicScores,
  GoodFlag,
} from '../../responses'
import { FileFieldSchema, isHttpUrl } from '../../util'
import { DynamicScoresPayloadSchema } from '../../util/schemas'

export const SubmitFlagRouteV2 = defineRoute({
  path: '/v2/challs/:id/submit',
  method: 'POST',
  bodyFormat: 'form-data',
  body: z
    .object({
      flag: z.string().check(z.minLength(1), z.maxLength(1024)),
      aiChatLinks: z.string().check(z.maxLength(20_480)),
      didNotUseAi: z.optional(z.literal('true')),
      solverFile: z.optional(
        FileFieldSchema.check(
          z.refine(
            file =>
              file.size > 0 &&
              file.size <= 2_000_000 &&
              /\.(?:py|js|ts|sh|c|cpp|go|rs|txt|png|jpe?g|webp)$/i.test(file.name),
            { message: 'Use a script or image file up to 2 MB.' }
          )
        )
      ),
    })
    .check(
      z.superRefine((body, ctx) => {
        const links = body.aiChatLinks
          .split(/\r?\n/)
          .map(link => link.trim())
          .filter(Boolean)
        if (
          body.didNotUseAi === 'true'
            ? links.length > 0
            : links.length === 0 || links.length > 10
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['aiChatLinks'],
            message: 'Provide 1-10 links or select "I did not use AI".',
          })
        }
        for (const link of links) {
          if (link.length > 2048 || !isHttpUrl(link)) {
            ctx.addIssue({
              code: 'custom',
              path: ['aiChatLinks'],
              message: 'Each AI chat link must be a valid HTTP(S) URL.',
            })
            break
          }
        }
      })
    ),
  goodResponses: [GoodFlag],
  badResponses: [
    BadBody,
    BadFlag,
    BadPerms,
    BadNotStarted,
    BadEnded,
    BadChallenge,
    BadRateLimit,
    BadAlreadySolvedChallenge,
    BadUnknownUser,
    BadToken,
  ],
  authRequired: true,
  params: z.object({ id: z.string() }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsWrite,
  onlyWhenNotFinished: true,
})

export const GetChallengesRouteV2 = defineRoute({
  publicAccess: ['challenges'],
  path: '/v2/challs',
  method: 'GET',
  goodResponses: [GoodChallengesV2],
  badResponses: [BadNotStarted, BadToken],
  authRequired: false,
  optionalAuth: true,
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

// intentionally has neither onlyWhenStarted nor onlyWhenNotFinished: a
// dynamic scoring backend must be able to seed scores before the event
// starts, and the leaderboard worker will drain any post-end deliveries into
// the final tally too
export const SubmitDynamicScoresRouteV2 = defineRoute({
  path: '/v2/challs/:id/scores',
  method: 'POST',
  goodResponses: [GoodDynamicScores],
  badResponses: [BadSignature, BadBody, BadReplayedRequest],
  authRequired: false,
  serviceAuth: 'dynamicChallenge',
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  body: DynamicScoresPayloadSchema,
})

export const GetChallengeSolvesRouteV2 = defineRoute({
  publicAccess: ['scoreboard', 'challenges'],
  path: '/v2/challs/:id/solves',
  method: 'GET',
  goodResponses: [GoodChallengeSolvesV2],
  badResponses: [BadNotStarted, BadChallenge, BadBody, BadToken],
  optionalAuth: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(1))
      .check(z.describe('Integer `>= 1`. Maximum enforced by config.')),
    offset: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(0))
      .check(z.describe('Integer `>= 0`.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})

export const GetChallengeScoresRouteV2 = defineRoute({
  publicAccess: ['scoreboard', 'challenges'],
  path: '/v2/challs/:id/scores',
  method: 'GET',
  goodResponses: [GoodChallengeScoresV2],
  badResponses: [BadNotStarted, BadChallenge, BadBody, BadToken],
  optionalAuth: true,
  params: z.object({
    id: z.string().check(z.describe('Challenge ID.')),
  }),
  query: z.object({
    // NOTE: Has max limits that are loaded from config
    limit: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(1))
      .check(z.describe('Integer `>= 1`. Maximum enforced by config.')),
    offset: z
      .pipe(z.coerce.number(), z.int())
      .check(z.gte(0))
      .check(z.describe('Integer `>= 0`.')),
  }),
  onlyWhenStarted: true,
  onlyWhenStartedPermissionsBypass: Permissions.challsRead,
})
