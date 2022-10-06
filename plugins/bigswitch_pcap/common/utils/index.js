import { IPv4_REGEX, IPv6_REGEX } from './constants';

export function getValidIp(ip) {
  var found = ip.match(IPv4_REGEX);
  if (! found) {
    found = ip.match(IPv6_REGEX);
  }
  return found && found.length ? found[0] : '';
}
