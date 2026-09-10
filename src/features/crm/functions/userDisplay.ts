import { fetchAllPages } from './bitrixApi';
import { getBitrixPortalOrigin } from './bitrixPath';

export interface UserDisplay {
  id: string;
  name: string;
  shortName: string;
  photo: string;
}

interface BitrixUserRecord {
  ID?: string | number;
  NAME?: string;
  LAST_NAME?: string;
  SECOND_NAME?: string;
  PERSONAL_PHOTO?: string | { src?: string; url?: string; URL?: string };
}

function displayFullName(user: BitrixUserRecord): string {
  return [user.LAST_NAME, user.NAME, user.SECOND_NAME]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    || `Пользователь #${user.ID ?? ''}`;
}

function displayShortName(user: BitrixUserRecord): string {
  return [user.LAST_NAME, user.NAME]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    || displayFullName(user);
}

function resolveUserPhotoUrl(photo: BitrixUserRecord['PERSONAL_PHOTO']): string {
  const rawPhoto = typeof photo === 'string'
    ? photo
    : photo && typeof photo === 'object'
      ? String(photo.src || photo.url || photo.URL || '')
      : '';

  if (!rawPhoto) {
    return '';
  }
  if (rawPhoto.startsWith('http')) {
    return rawPhoto;
  }
  if (rawPhoto.startsWith('//')) {
    return `https:${rawPhoto}`;
  }

  const origin = getBitrixPortalOrigin();
  return `${origin}${rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`}`;
}

export function getUserInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export async function loadUserDisplaysByIds(
  ids: Array<string | number | null | undefined>,
): Promise<Map<string, UserDisplay>> {
  const uniqueIds = [...new Set(
    ids
      .map((id) => String(id ?? '').trim())
      .filter(Boolean),
  )];

  const result = new Map<string, UserDisplay>();
  if (!uniqueIds.length) {
    return result;
  }

  const users = await fetchAllPages<BitrixUserRecord>('user.get', {
    FILTER: { '@ID': uniqueIds },
  });

  users.forEach((user) => {
    const id = String(user.ID ?? '').trim();
    if (!id) {
      return;
    }
    result.set(id, {
      id,
      name: displayFullName(user),
      shortName: displayShortName(user),
      photo: resolveUserPhotoUrl(user.PERSONAL_PHOTO),
    });
  });

  return result;
}
