import axios, { type AxiosInstance } from 'axios'
import api from './apiClient.js'
import type {
  Account,
  VotingFinalistsResponse,
  VotingStatusResponse,
  VotingCastRequest,
  VotingCastResponse,
} from '$types/account.js'
import type { Team, TeamPreview } from '$types/team.js'
import type { Flags } from '$types/flags.js'

// Error helpers --------------------------------------------------------------------------------

export interface ApiError extends Error {
  status: number
  message: string
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    'message' in err
  )
}

// toApiError promotes unknown values (Axios errors or otherwise) into ApiError.
function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err) && err.response) {
    const { status, data } = err.response
    const message =
      typeof data?.message === 'string' ? data.message : err.message
    return { name: 'ApiError', status, message }
  }

  const message = err instanceof Error ? err.message : 'Unknown error'
  return { name: 'ApiError', status: 0, message }
}

// request executes the provided axios call and converts failures into ApiError.
async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await fn()
    return data
  } catch (err) {
    throw toApiError(err)
  }
}

export interface CredentialRequest {
  email: string
  password: string
}

export interface AccountTokenResponse {
  token: string
  account: Account
}

export interface AccountMembersResponse extends AccountTokenResponse {
  members: Account[]
}

export interface TeamMembersResponse {
  members: Account[]
}

export interface AccountCheckRequest {
  email: string
}

export interface TeamChangeNameRequest {
  name: string
}

export interface TeamChangeTableRequest {
  table: string
}

export interface SubmissionPayload {
  name?: string
  desc?: string
  repo?: string
  pres?: string
}

export interface AccountCheckResponse {
  registered: boolean
}

// createApiHelpers wires domain-specific helpers onto a shared axios instance so runes/tests
// can consume a consistent, typed surface area.
export function createApiHelpers(apiClient: AxiosInstance = api) {
  const Accounts = {
    // check verifies onboarding status for an email.
    check: (email: string) =>
      request<AccountCheckResponse>(() =>
        apiClient.post('/accounts/auth/check', {
          email,
        } satisfies AccountCheckRequest)
      ),
    // register issues a token and profile for new accounts.
    register: (payload: CredentialRequest) =>
      request<AccountTokenResponse>(() =>
        apiClient.post('/accounts/auth/register', payload)
      ),
    // login authenticates via credentials.
    login: (payload: CredentialRequest) =>
      request<AccountTokenResponse>(() =>
        apiClient.post('/accounts/auth/login', payload)
      ),
    // whoami resolves the current account from the auth token.
    whoami: () =>
      request<Account>(() => apiClient.get('/accounts/meta/whoami')),
    // editName updates the display name and returns a refreshed token payload.
    editName: (name: string) =>
      request<AccountTokenResponse>(() =>
        apiClient.patch('/accounts/me', { name })
      ),
    // flags retrieves participant feature flags.
    flags: () => request<Flags>(() => apiClient.get('/accounts/flags')),
  }

  const Teams = {
    // detail returns the caller's team document (requires membership).
    detail: () => request<Team>(() => apiClient.get('/teams')),
    // preview returns metadata for a team by ID without requiring membership.
    preview: (teamId: string) =>
      request<TeamPreview>(() =>
        apiClient.get('/teams/meta/preview', { params: { id: teamId } })
      ),
    // create provisions a team and returns token/account for the creator.
    create: (name: string) =>
      request<AccountTokenResponse>(() => apiClient.post('/teams', { name })),
    // changeName mutates the team name.
    changeName: (payload: TeamChangeNameRequest) =>
      request<Team>(() => apiClient.patch('/teams/name', payload)),
    // updateTable mutates the team table.
    changeTable: (payload: TeamChangeTableRequest) =>
      request<Team>(() => apiClient.patch('/teams/table', payload)),
    // remove deletes the team (single-member constraint) and refreshes auth state.
    remove: () =>
      request<AccountTokenResponse>(() => apiClient.delete('/teams')),
    // members lists the hydrated roster for the team.
    members: () => request<Account[]>(() => apiClient.get('/teams/members')),
    // join enrolls the caller into the specified team and returns token/account/members.
    join: (id: string) =>
      request<AccountMembersResponse>(() =>
        apiClient.patch('/teams/members/join', undefined, { params: { id } })
      ),
    // leave removes the caller and returns the remaining roster.
    leave: () =>
      request<AccountMembersResponse>(() =>
        apiClient.patch('/teams/members/leave')
      ),
    // kick expels the given account ID and returns the updated roster.
    kick: (id: string) =>
      request<TeamMembersResponse>(() =>
        apiClient.patch('/teams/members/kick', undefined, { params: { id } })
      ),
  }

  const Submissions = {
    // updateName/Desc/Repo/Pres patch individual submission fields and return the updated team doc.
    updateName: (name: string) =>
      request<Team>(() => apiClient.patch('/teams/submissions/name', { name })),
    updateDesc: (desc: string) =>
      request<Team>(() => apiClient.patch('/teams/submissions/desc', { desc })),
    updateRepo: (repo: string) =>
      request<Team>(() => apiClient.patch('/teams/submissions/repo', { repo })),
    updatePres: (pres: string) =>
      request<Team>(() => apiClient.patch('/teams/submissions/pres', { pres })),
  }

  const Flags = {
    // fetch retrieves administrator flag state and active stage.
    fetch: () => request<Flags>(() => apiClient.get('/accounts/flags')),
  }

  const General = {
    // ping checks if the API is alive.
    ping: () => request<string>(() => apiClient.get('/meta/ping')),
  }

  const Voting = {
    // getFinalists retrieves the 3 finalist teams.
    getFinalists: () =>
      request<VotingFinalistsResponse>(() =>
        apiClient.get('/accounts/voting/finalists')
      ),
    // getStatus retrieves voting status including whether voting is open and if user has voted.
    getStatus: () =>
      request<VotingStatusResponse>(() =>
        apiClient.get('/accounts/voting/status')
      ),
    // castVote records a vote for one of the finalist teams.
    castVote: (payload: VotingCastRequest) =>
      request<VotingCastResponse>(() =>
        apiClient.post('/accounts/voting/vote', payload)
      ),
  }

  return { Accounts, Teams, Submissions, Flags, General, Voting }
}

export const openhackApi = createApiHelpers()
