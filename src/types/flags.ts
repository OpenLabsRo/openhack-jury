export interface Stage {
  id: string
  name: string
  turnoff: string[]
  turnon: string[]
}

export interface Flags {
  flags: Record<string, boolean>
  stage: Stage
}
