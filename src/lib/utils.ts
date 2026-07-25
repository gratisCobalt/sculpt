import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFirstName(displayName?: string | null, fallback = 'Buddy'): string {
  const firstToken = displayName?.trim().split(/\s+/)[0] || ''
  const withoutEmoji = firstToken
    .replace(/[\d#*]\uFE0F?\u20E3|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u200D|\uFE0E|\uFE0F/gu, '')
    .trim()

  return withoutEmoji || fallback
}

export function getFirstNameAvatarUrl(avatarUrl?: string | null, displayName?: string | null): string | null {
  if (!avatarUrl) return null

  try {
    const url = new URL(avatarUrl)
    if (url.hostname === 'ui-avatars.com' || url.hostname.endsWith('.ui-avatars.com')) {
      url.searchParams.set('name', getFirstName(displayName))
      return url.toString()
    }
  } catch {
    // Keep relative or otherwise non-standard app-owned avatar URLs unchanged.
  }

  return avatarUrl
}
