/* eslint-disable camelcase */
/* eslint-disable quotes */

// These are new regexes that seem to work better than older ones.
// Keeping the old ones for parts that use them already.

// provides validaton for both ipv4 and cidr
export const IPv4_AND_CIDR_NEW_REGEX = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/gim;

export const IPv4_ADDRESS_REGEX_STRING =
  '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|' +
  '[01]?[0-9][0-9]?)';

export const IPv4_CIDR_REGEX_STRING =
  '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|' +
  '[01]?[0-9][0-9]?)/(?:3[0-2]|[0-2][0-9]|[0-9])$';

export const IPv6_ADDRESS_REGEX_STRING =
  '^s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}' +
  '(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|' +
  '1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2}' +
  ')|:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d))' +
  '{3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]' +
  '{1,4})?:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]' +
  '?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A' +
  '-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1' +
  'dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5}' +
  ')|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|' +
  '2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]' +
  '{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(' +
  '.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7}' +
  ')|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|' +
  '2[0-4]d|1dd|[1-9]?d)){3}))|:)))(%.+)?s*';

export const COMMUNITY_ID_REGEX_STRING = '^1:[ -~]{27}=$';

export const IPv6_CIDR_REGEX_STRING =
  // eslint-disable-next-line max-len
  `^s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]d|1dd|[1-9]?d)(.(25[0-5]|2[0-4]d|1dd|[1-9]?d)){3}))|:)))(%.+)?s*(\/(12[0-8]|1[0-1][0-9]|[1-9][0-9]|[0-9]))$`;

export const IPv4_REGEX = new RegExp(IPv4_ADDRESS_REGEX_STRING, 'g');
export const IPv4_CIDR_REGEX = new RegExp(IPv4_CIDR_REGEX_STRING, 'g');
export const IPv6_REGEX = new RegExp(IPv6_ADDRESS_REGEX_STRING, 'g');
export const IPv6_CIDR_REGEX = new RegExp(IPv6_CIDR_REGEX_STRING, 'g');
export const COMMUNITY_ID_REGEX = new RegExp(COMMUNITY_ID_REGEX_STRING, 'g');

export const SOURCE_IPv4_REGEX = /sIp[\s]*:[\s]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
export const DESTINATION_IPv4_REGEX = /dIp[\s]*:[\s]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/;
export const SOURCE_IPv6_REGEX = new RegExp(
  'sIp[s]*:[s]*' + IPv6_ADDRESS_REGEX_STRING,
  'g'
);
export const DESTINATION_IPv6_REGEX = new RegExp(
  'dIp[s]*:[s]*' + IPv6_ADDRESS_REGEX_STRING,
  'g'
);
export const CID_COMMUNITY_ID_REGEX = new RegExp(
  'community_id[s]*:[s]*' + COMMUNITY_ID_REGEX_STRING,
  'g'
);

export const MAC_ADDRESS_REGEX = (() => {
  var oDefaults = {
    allowColons: true,
    allowHyphens: false,
    allowDots: false
  };

  var aSeparators = [];
  var aRegExes = [];

  if (oDefaults.allowColons) {
    aSeparators.push(':');
  }

  if (oDefaults.allowHyphens) {
    aSeparators.push('-');
  }

  var reSegment = '(?:[0-9a-fA-F]{2})';
  var aParts = [];
  for (var i = 0; i < 6; i++) {
    aParts.push(reSegment);
  }
  aRegExes.push(aParts.join('[' + aSeparators.join('') + ']'));

  if (oDefaults.allowDots) {
    var reDotSegment = '(?:[0-9a-fA-F]{4})';
    var aDotParts = [];
    for (var i = 0; i < 3; i++) {
      aDotParts.push(reDotSegment);
    }
    aRegExes.push(aDotParts.join('\\.'));
  }

  return aRegExes.join('|');
})();
