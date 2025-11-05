// Integration-style harness: runs helpers and runes against a mocked Axios client so we can verify
// positive and negative flows without a live backend.
import { strict as assert } from 'node:assert'
import type { AxiosInstance } from 'axios'
import {
  createApiHelpers,
  openhackApi,
  isApiError,
  type ApiError,
  type AccountMembersResponse,
  type TeamMembersResponse,
  type TeamChangeNameRequest,
} from '../lib/api/openhackApi.js'
import type { Account } from '../types/account.js'
import type { Team } from '../types/team.js'
import type { Flags } from '../types/flags.js'
import { accountRune, logout, whoami } from '../runes/accountRune.js'
import {
  teamRune,
  teamMembersRune,
  createTeam,
  join,
  leave,
  kick,
  deleteTeam,
  changeTeamName,
  loadMembers,
  getTeam,
  updateSubmissionName,
} from '../runes/teamRune.js'
import { fetchFlags, flagsRune } from '../runes/flagsRune.js'
import { get } from 'svelte/store'

type Method = 'get' | 'post' | 'patch' | 'delete' | 'put'

interface AccountCheckResponse {
  registered: boolean
}

interface MockHandlerInput {
  data?: unknown
  params?: Record<string, unknown> | undefined
}

interface MockHandlerResult {
  status: number
  data: any
}

type MockHandler = (input: MockHandlerInput) => MockHandlerResult

function createAxiosError(status: number, data: any) {
  const message =
    typeof data?.message === 'string' ? data.message : 'Request failed'
  const error = new Error(message) as any
  error.isAxiosError = true
  error.response = { status, data }
  return error
}

function createMockAxios(handlers: Record<string, MockHandler>): AxiosInstance {
  const call = (method: Method, url: string, data?: any, config: any = {}) => {
    const key = `${method} ${url}`
    const handler = handlers[key]
    if (!handler) {
      return Promise.reject(new Error(`Unhandled request: ${key}`))
    }

    const result = handler({ data, params: config?.params })

    if (result.status >= 200 && result.status < 300) {
      return Promise.resolve({ data: result.data } as any)
    }

    return Promise.reject(createAxiosError(result.status, result.data))
  }

  const instance = {
    defaults: { headers: { common: {} as Record<string, string> } },
    interceptors: {
      request: { use: () => 0, eject: () => {} },
      response: { use: () => 0, eject: () => {} },
    },
    get: (url: string, config?: any) => call('get', url, undefined, config),
    post: (url: string, data?: any, config?: any) =>
      call('post', url, data, config),
    patch: (url: string, data?: any, config?: any) =>
      call('patch', url, data, config),
    delete: (url: string, config?: any) =>
      call('delete', url, undefined, config),
    put: (url: string, data?: any, config?: any) =>
      call('put', url, data, config),
    request: (config: any) =>
      call(
        (config?.method ?? 'get') as Method,
        config?.url ?? '',
        config?.data,
        config
      ),
    head: () =>
      Promise.reject(new Error('HEAD not implemented in mock client')),
    options: () =>
      Promise.reject(new Error('OPTIONS not implemented in mock client')),
  } as unknown as AxiosInstance

  return instance
}

const sampleAccount: Account = {
  id: 'acct_1',
  email: 'member@example.com',
  password: 'hashed',
  firstName: 'Member',
  lastName: 'One',
  name: 'Member One',
  teamID: 'team_1',
}

const sampleAccountUpdated: Account = {
  ...sampleAccount,
  firstName: 'Member',
  lastName: 'Two',
  name: 'Member Two',
}

const secondaryAccount: Account = {
  id: 'acct_2',
  email: 'other@example.com',
  password: 'hashed',
  firstName: 'Other',
  lastName: 'User',
  name: 'Other User',
  teamID: 'team_1',
}

const sampleTeam: Team = {
  id: 'team_1',
  name: 'New Team',
  members: [sampleAccount.id, secondaryAccount.id],
  submission: {
    name: 'Demo',
    desc: 'Demo description',
    repo: 'https://example.com/repo',
    pres: 'https://example.com/pres',
  },
  table: 'A1',
  deleted: false,
}

const flagsPayload: Flags = {
  flags: { demo: true },
  stage: { id: 'stage', name: 'Stage', turnoff: [], turnon: [] },
}

// runHelperTests exercises happy-path helper calls to ensure DTO wiring and response shaping work.
async function runHelperTests() {
  const helpers = createApiHelpers(
    createMockAxios({
      'post /accounts/check': () => ({
        status: 200,
        data: { registered: true },
      }),
      'post /accounts/register': () => ({
        status: 200,
        data: { token: 'tkn', account: sampleAccount },
      }),
      'post /accounts/login': () => ({
        status: 200,
        data: { token: 'tkn', account: sampleAccountUpdated },
      }),
      'get /accounts/meta/whoami': () => ({
        status: 200,
        data: sampleAccountUpdated,
      }),
      'patch /accounts/me': () => ({
        status: 200,
        data: { token: 'tkn', account: sampleAccountUpdated },
      }),
      'get /accounts/flags': () => ({ status: 200, data: flagsPayload }),
      'get /teams': () => ({ status: 200, data: sampleTeam }),
      'get /teams/meta/preview': () => ({ status: 200, data: sampleTeam }),
      'post /teams': () => ({
        status: 200,
        data: { token: 'tkn', account: sampleAccount },
      }),
      'patch /teams/name': () => ({
        status: 200,
        data: { ...sampleTeam, name: 'Renamed Team' },
      }),
      'patch /teams/table': () => ({
        status: 200,
        data: { ...sampleTeam, table: 'A1' },
      }),
      'delete /teams': () => ({
        status: 200,
        data: { token: 'tkn', account: sampleAccount },
      }),
      'get /teams/members': () => ({
        status: 200,
        data: [sampleAccount, secondaryAccount],
      }),
      'patch /teams/members/join': () => ({
        status: 200,
        data: {
          token: 'tkn',
          account: sampleAccount,
          members: [sampleAccount, secondaryAccount],
        } satisfies AccountMembersResponse,
      }),
      'patch /teams/members/leave': () => ({
        status: 200,
        data: {
          token: 'tkn',
          account: { ...sampleAccount, teamID: '' },
          members: [secondaryAccount],
        } satisfies AccountMembersResponse,
      }),
      'patch /teams/members/kick': () => ({
        status: 200,
        data: {
          members: [sampleAccount],
        } satisfies TeamMembersResponse,
      }),
      'patch /teams/submissions/name': () => ({
        status: 200,
        data: {
          ...sampleTeam,
          submission: { ...sampleTeam.submission, name: 'Updated' },
        },
      }),
    })
  )

  const registered = await helpers.Accounts.check('user@example.com')
  assert.equal(registered.registered, true)

  const registerRes = await helpers.Accounts.register({
    email: 'member@example.com',
    password: 'secret',
  })
  assert.equal(registerRes.account.id, sampleAccount.id)

  const loginRes = await helpers.Accounts.login({
    email: 'member@example.com',
    password: 'secret',
  })
  assert.equal(loginRes.account.name, sampleAccountUpdated.name)

  const whoamiRes = await helpers.Accounts.whoami()
  assert.equal(whoamiRes.email, sampleAccountUpdated.email)

  const flags = await helpers.Accounts.flags()
  assert.equal(flags.flags.demo, true)

  const team = await helpers.Teams.detail()
  assert.equal(team.id, sampleTeam.id)

  const members = await helpers.Teams.members()
  assert.equal(members.length, 2)

  const joinRes = await helpers.Teams.join('team_1')
  assert.equal(joinRes.members.length, 2)

  const leaveRes = await helpers.Teams.leave()
  assert.equal(leaveRes.members.length, 1)

  const kickRes = await helpers.Teams.kick('acct_2')
  assert.equal(kickRes.members.length, 1)

  const changeNameRes = await helpers.Teams.changeName({ name: 'New Name' })
  assert.equal(changeNameRes.name, 'New Name')

  const submission = await helpers.Submissions.updateName('Updated')
  assert.equal(submission.submission.name, 'Updated')

  const table = await helpers.Teams.changeTable({ table: 'A1' })
  assert.equal(team.table, 'A1')
}

// runHelperNegativeTests confirms that helper failures produce ApiError with expected metadata.
async function runHelperNegativeTests() {
  const helpers = createApiHelpers(
    createMockAxios({
      'post /accounts/check': () => ({
        status: 404,
        data: {
          message: 'account not initialized - talk to the administrator',
        },
      }),
      'patch /teams/members/join': () => ({
        status: 409,
        data: { message: 'account already has a team' },
      }),
    })
  )

  try {
    await helpers.Accounts.check('user@example.com')
    assert.fail('Expected Accounts.check to throw')
  } catch (err: unknown) {
    if (!isApiError(err)) throw err
    assert.equal(err.status, 404)
  }

  try {
    await helpers.Teams.join('team_1')
    assert.fail('Expected Teams.join to throw')
  } catch (err: unknown) {
    if (!isApiError(err)) throw err
    assert.equal(err.status, 409)
    assert.equal(err.message, 'account already has a team')
  }
}

function resetStores() {
  accountRune.set(null)
  teamRune.set(null)
  teamMembersRune.set([])
  flagsRune.set(null)
}

// runRuneTests validates that rune-level logic updates Svelte stores for all success flows.
async function runRuneTests() {
  resetStores()

  const original = {
    detail: openhackApi.Teams.detail,
    create: openhackApi.Teams.create,
    members: openhackApi.Teams.members,
    join: openhackApi.Teams.join,
    leave: openhackApi.Teams.leave,
    kick: openhackApi.Teams.kick,
    changeName: openhackApi.Teams.changeName,
    changeTable: openhackApi.Teams.changeTable,
    remove: openhackApi.Teams.remove,
    flagsFetch: openhackApi.Flags.fetch,
    submissionsUpdate: openhackApi.Submissions.updateName,
    whoami: openhackApi.Accounts.whoami,
    accountFlags: openhackApi.Accounts.flags,
  }

  openhackApi.Teams.detail = async () => sampleTeam
  openhackApi.Teams.members = async () => [sampleAccount, secondaryAccount]
  openhackApi.Teams.create = async (name: string) => ({
    token: 'tkn',
    account: sampleAccount,
  })
  openhackApi.Teams.join = async () => ({
    token: 'tkn',
    account: sampleAccount,
    members: [sampleAccount, secondaryAccount],
  })
  openhackApi.Teams.leave = async () => ({
    token: 'tkn',
    account: { ...sampleAccount, teamID: '' },
    members: [secondaryAccount],
  })
  openhackApi.Teams.kick = async () => ({ members: [sampleAccount] })
  openhackApi.Teams.changeName = async (payload) => ({
    ...sampleTeam,
    name: payload.name,
  })
  openhackApi.Teams.remove = async () => ({
    token: 'tkn',
    account: { ...sampleAccount, teamID: '' },
  })
  openhackApi.Flags.fetch = async () => flagsPayload
  openhackApi.Submissions.updateName = async () => ({
    ...sampleTeam,
    submission: { ...sampleTeam.submission, name: 'Updated Submission' },
  })
  openhackApi.Accounts.whoami = async () => sampleAccountUpdated
  openhackApi.Accounts.flags = async () => flagsPayload

  try {
    await createTeam('Any')
    const createdTeam = get(teamRune) as Team | null
    if (!createdTeam) throw new Error('teamRune not populated after create')
    assert.equal(createdTeam.id, sampleTeam.id)
    const createdMembers = get(teamMembersRune) as Account[]
    assert.equal(createdMembers.length, 2)

    const teamAfterJoin = await join('team_1')
    assert.equal(teamAfterJoin.id, sampleTeam.id)
    const membersAfterJoin = get(teamMembersRune) as Account[]
    assert.equal(membersAfterJoin.length, 2)

    await changeTeamName('Renamed')
    const changedTeamName = get(teamRune) as Team | null
    if (!changedTeamName)
      throw new Error('teamRune not populated after changeName')
    assert.equal(changedTeamName.name, 'Renamed')

    await loadMembers()
    const reloadedMembers = get(teamMembersRune) as Account[]
    assert.equal(reloadedMembers.length, 2)

    await updateSubmissionName('Updated Submission')
    const submissionTeamState = get(teamRune) as Team | null
    if (!submissionTeamState)
      throw new Error('teamRune not populated after submission update')
    const submissionState = submissionTeamState.submission
    if (!submissionState)
      throw new Error('submission not populated after update')
    assert.equal(submissionState.name, 'Updated Submission')

    await fetchFlags()
    const flagsState = get(flagsRune) as Flags | null
    if (!flagsState) throw new Error('flagsRune not populated after fetch')
    assert.equal(flagsState.flags.demo, true)

    await kick('acct_2')
    const membersAfterKick = get(teamMembersRune) as Account[]
    assert.equal(membersAfterKick.length, 1)

    await leave()
    assert.equal(get(teamRune), null)
    const membersAfterLeave = get(teamMembersRune) as Account[]
    assert.equal(membersAfterLeave.length, 0)

    await deleteTeam()
    assert.equal(get(teamRune), null)

    const who = await whoami()
    assert.equal(who.name, 'Member Two')

    logout()
    assert.equal(get(accountRune), null)
  } finally {
    openhackApi.Teams.detail = original.detail
    openhackApi.Teams.create = original.create
    openhackApi.Teams.members = original.members
    openhackApi.Teams.join = original.join
    openhackApi.Teams.leave = original.leave
    openhackApi.Teams.kick = original.kick
    openhackApi.Teams.changeName = original.changeName
    openhackApi.Teams.changeTable = original.changeTable
    openhackApi.Teams.remove = original.remove
    openhackApi.Flags.fetch = original.flagsFetch
    openhackApi.Submissions.updateName = original.submissionsUpdate
    openhackApi.Accounts.whoami = original.whoami
    openhackApi.Accounts.flags = original.accountFlags
  }
}

// runRuneNegativeTests ensures rune error surfaces bubble ApiError instead of being swallowed.
async function runRuneNegativeTests() {
  resetStores()

  const originalJoin = openhackApi.Teams.join
  openhackApi.Teams.join = async () => {
    const error: ApiError = {
      name: 'ApiError',
      status: 409,
      message: 'account already has a team',
    }
    throw error
  }

  try {
    await join('team_1')
    assert.fail('Expected join to throw via ApiError')
  } catch (err: unknown) {
    if (!isApiError(err)) throw err
    assert.equal(err.status, 409)
  } finally {
    openhackApi.Teams.join = originalJoin
  }
}

const tests: Array<{ name: string; run: () => Promise<void> }> = [
  { name: 'API helpers handle positive responses', run: runHelperTests },
  {
    name: 'API helpers surface ApiError negatives',
    run: runHelperNegativeTests,
  },
  { name: 'Runes update stores on happy paths', run: runRuneTests },
  { name: 'Runes propagate ApiError on failure', run: runRuneNegativeTests },
]

async function main() {
  for (const test of tests) {
    try {
      await test.run()
      console.log(`✓ ${test.name}`)
    } catch (err) {
      console.error(`✗ ${test.name}`)
      console.error(err)
      process.exitCode = 1
      break
    }
  }
}

main()
