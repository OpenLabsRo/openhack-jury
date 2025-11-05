export interface Submission {
  name: string
  desc: string
  repo: string
  pres: string
}

export interface Team {
  id: string
  name: string
  members: string[]
  submission: Submission
  deleted: boolean
  table: string
}

export interface TeamPreview {
  id: string
  name: string
  table?: string
  members_count?: number
  members?: Account[]
  submission?: Submission
}
import type { Account } from './account.js'
