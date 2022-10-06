/* eslint-disable eqeqeq */
// This file is for utilities in regards to the packet recorder
// input and ouptu (ie. formatting the stenographer query)

export default class PacketRecorderUtils {
  getTimeFilterInHours(count, unit) {
    if (unit == 's' || unit == 'm' || unit == 'h') {
      return 'after ' + count + unit + ' ago';
    } else if (unit == 'd') {
      return 'after ' + count * 24 + 'h' + ' ago';
    } else if (unit == 'w') {
      return 'after ' + count * 24 * 7 + 'h' + ' ago';
    } else if (unit == 'M') {
      return 'after ' + count * 730 + 'h' + ' ago';
    } else if (unit == 'y') {
      return 'after ' + count * 8760 + 'h' + ' ago';
    }
    return null;
  }
}
