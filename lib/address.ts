export function shortenAddress(address: string, prefixLength = 11, suffixLength = 4) {
  if (address.length <= prefixLength + suffixLength + 1) return address;
  return `${address.slice(0, prefixLength)}…${address.slice(-suffixLength)}`;
}

export function copyFullAddress(clipboard: Pick<Clipboard, 'writeText'>, address: string) {
  return clipboard.writeText(address);
}
