export interface Consumables {
  coffee: boolean
  jerky: boolean
  pizza: boolean
  sandwiches: number
  water: number
}

export interface Account {
  id: string
  email: string
  teamID?: string
  firstName: string
  lastName: string
  name?: string
  password?: string // Not always present in API responses
  checkedIn?: boolean
  consumables?: Consumables
  dob?: string
  foodRestrictions?: string
  medicalConditions?: string
  phoneNumber?: string
  present?: boolean
  university?: string
  hasVoted?: boolean
}

export interface TeamSubmission {
  desc?: string
  name?: string
  pres?: string
  repo?: string
}

export interface Team {
  id: string
  name: string
  deleted?: boolean
  members?: string[]
  submission?: TeamSubmission
  table?: string
}

export interface VotingFinalistsResponse {
  finalists: Team[]
}

export interface VotingStatusResponse {
  finalists: Team[]
  hasVoted: boolean
  votingOpen: boolean
}

export interface VotingCastRequest {
  teamID: string
}

export interface VotingCastResponse {
  message: string
}
