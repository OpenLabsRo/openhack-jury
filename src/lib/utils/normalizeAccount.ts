import type { Account } from '$types/account.js'

type AccountLike = Omit<Account, 'firstName' | 'lastName' | 'teamID'> & {
  firstName?: string | null
  lastName?: string | null
  teamID?: string | null
  name?: string | null
}

const DEFAULT_FIRST_NAME = 'Participant'

export function normalizeAccount(input: AccountLike): Account {
  const rawName = input.name?.trim() ?? ''
  const nameParts = rawName ? rawName.split(/\s+/).filter(Boolean) : []

  let firstName = (input.firstName ?? nameParts[0] ?? '').trim()
  let lastName = (input.lastName ?? nameParts.slice(1).join(' ') ?? '').trim()

  if (!firstName && !lastName && rawName) {
    firstName = rawName
  }

  if (!firstName) {
    firstName = DEFAULT_FIRST_NAME
  }

  const displayName = rawName || [firstName, lastName].filter(Boolean).join(' ')

  return {
    ...input,
    teamID: input.teamID ?? '',
    firstName,
    lastName,
    name: displayName || undefined,
  }
}

export function normalizeAccounts(accounts: AccountLike[] | undefined | null) {
  return (accounts ?? []).map((account) => normalizeAccount(account))
}
