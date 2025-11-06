/**
 * Judge-specific types aligned with API spec definitions
 */

export interface JudgeUpgradeRequest {
  token: string
}

export interface Judge {
  id: string
  name: string
  currentTeam: number
  pair: string
  nextTeamTime: string
}

export interface JudgeUpgradeResponse {
  token: string
  judge: Judge
}

export type NextTeamResponse = Team

export interface TeamSubmission {
  name?: string
  desc?: string
  repo?: string
  pres?: string
}

export interface Team {
  id: string
  name: string
  table?: string
  submission?: TeamSubmission
  members?: string[]
  deleted?: boolean
}

export interface CreateJudgmentRequest {
  winningTeamID: string
  losingTeamID: string
}

export interface Judgment {
  id: string
  judgeID: string
  winningTeamID: string
  losingTeamID: string
  date: string
}

/**
 * Error response type for finished judging
 */
export interface JudgingFinished {
  message: string
}

/**
 * Error response type for judge resting
 */
export interface JudgeResting {
  message: string
}
