import isFQDN from 'validator/lib/isFQDN';
import isIP from 'validator/lib/isIP';
import isURL from 'validator/lib/isURL';

export const downloadPage = 'https://github.com/neiL-Garrett/FreeFlowy';

export const openAppFlowySchema = 'appflowy-flutter://';

export const iosDownloadLink = 'https://github.com/neiL-Garrett/FreeFlowy';
export const androidDownloadLink = 'https://github.com/neiL-Garrett/FreeFlowy';

export const desktopDownloadLink = 'https://github.com/neiL-Garrett/FreeFlowy';

export function isValidUrl(input: string) {
  return isURL(input, { require_protocol: true, require_host: false });
}

// Process the URL to make sure it's a valid URL
// If it's not a valid URL(eg: 'appflowy.io' or '192.168.1.2'), we'll add 'https://' to the URL
export function processUrl(input: string) {
  let processedUrl = input;

  if (isValidUrl(input)) {
    return processedUrl;
  }

  if (input.startsWith('http')) {
    return processedUrl;
  }

  if (input.startsWith('localhost')) {
    return `http://${input}`;
  }

  const domain = input.split('/')[0];

  if (isIP(domain) || isFQDN(domain)) {
    processedUrl = `https://${input}`;
    if (isValidUrl(processedUrl)) {
      return processedUrl;
    }
  }

  return;
}

export async function openUrl(url: string, target: string = '_current') {

  const newUrl = processUrl(url);

  if (!newUrl) return;

  window.open(newUrl, target);
}
