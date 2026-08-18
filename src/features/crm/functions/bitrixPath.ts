const BITRIX_PORTAL_ORIGIN = 'https://ittochka.bitrix24.ru';

import { getBx24WithOpenPath } from './bitrixClient';

export function getBitrixPortalOrigin(): string {
  const domain = getBx24WithOpenPath()?.getAuth?.()?.domain;
  if (domain) {
    return `https://${domain}`;
  }
  return BITRIX_PORTAL_ORIGIN;
}

export function openBitrixPath(path: string, onClose?: () => void): void {
  const bx24 = getBx24WithOpenPath();
  if (bx24?.openPath) {
    if (onClose) {
      bx24.openPath(path, () => onClose());
    } else {
      bx24.openPath(path);
    }
    return;
  }

  const url = path.startsWith('http') ? path : `${getBitrixPortalOrigin()}${path}`;
  window.open(url, '_blank', 'noopener,noreferrer');

  if (onClose) {
    window.setTimeout(onClose, 1000);
  }
}
