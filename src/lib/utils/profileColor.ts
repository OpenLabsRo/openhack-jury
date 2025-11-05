const PROFILE_GRADIENTS = [
  'linear-gradient(135deg,#FFAB2E,#FF0022)',
  'linear-gradient(135deg,#4F46E5,#EC4899)',
  'linear-gradient(135deg,#2563EB,#06B6D4)',
  'linear-gradient(135deg,#F97316,#F43F5E)',
  'linear-gradient(135deg,#8B5CF6,#22D3EE)',
  'linear-gradient(135deg,#14B8A6,#84CC16)',
]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return hash
}

export function getProfileGradient(
  identifier: string | undefined | null
): string {
  if (!identifier) {
    return PROFILE_GRADIENTS[0]
  }

  const hash = Math.abs(hashString(identifier))
  const index = hash % PROFILE_GRADIENTS.length
  return PROFILE_GRADIENTS[index]
}

export function getInitials(name: string | undefined | null): string {
  if (!name) return 'MI'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'MI'
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return initials || 'MI'
}
