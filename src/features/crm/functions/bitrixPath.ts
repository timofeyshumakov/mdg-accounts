const BITRIX_PORTAL_ORIGIN = 'https://ittochka.bitrix24.ru';

import { getBx24WithOpenPath } from './bitrixClient';

export function getBitrixPortalOrigin(): string {
  const domain = getBx24WithOpenPath()?.getAuth?.()?.domain;
  if (domain) {
    return `https://${domain}`;
  }
  return BITRIX_PORTAL_ORIGIN;
}

export function toBitrixAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) {
    return path;
  }
  return `${getBitrixPortalOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function openBitrixPath(
  path: string,
  onCloseOrOptions?: (() => void) | { newTab?: boolean; onClose?: () => void },
): void {
  const options = typeof onCloseOrOptions === 'function'
    ? { onClose: onCloseOrOptions }
    : (onCloseOrOptions ?? {});
  const onClose = options.onClose;
  const newTab = options.newTab === true;

  if (!newTab) {
    const bx24 = getBx24WithOpenPath();
    if (bx24?.openPath) {
      if (onClose) {
        bx24.openPath(path, () => onClose());
      } else {
        bx24.openPath(path);
      }
      return;
    }
  }

  window.open(toBitrixAbsoluteUrl(path), '_blank', 'noopener,noreferrer');

  if (onClose) {
    window.setTimeout(onClose, 1000);
  }
}

export function openBitrixPathInNewWindow(path: string): void {
  openBitrixPath(path, { newTab: true });
}

export function buildContactDetailsPath(contactId: string | number): string {
  return `/crm/contact/details/${contactId}/`;
}
