import { SubmitFlagRouteV2 } from '@rctf/types'
import { submitFlag } from '../../../../services/challenges'
import challsGroup from '../group'

challsGroup.route(SubmitFlagRouteV2, async ({ res, ctx, params, body, user }) =>
  submitFlag(res, ctx.var.db, ctx.var.redis, ctx.var.logger, {
    userId: user.id,
    challengeId: params.id,
    flag: body.flag,
    aiChatUrls: body.aiChatLinks
      .split(/\r?\n/)
      .map(link => link.trim())
      .filter(Boolean),
    didNotUseAi: body.didNotUseAi === 'true',
    solverScript: body.solverScript?.trim() || undefined,
    solverFile: body.solverFile,
    submissionIp: ctx.var.ip,
  })
)
