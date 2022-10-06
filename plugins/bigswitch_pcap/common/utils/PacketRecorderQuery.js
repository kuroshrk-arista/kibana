import {
  // eslint-disable-next-line camelcase
  IPv4_REGEX,
  IPv4_CIDR_REGEX,
  IPv6_REGEX,
  IPv6_CIDR_REGEX
} from './constants';

const SRC_HOST_BPF_PREDICATE = 'src host';
const DST_HOST_BPF_PREDICATE = 'dst host';
const SRC_NET_BPF_PREDICATE = 'src net';
const DST_NET_BPF_PREDICATE = 'dst net';
const SRC_PORT_BPF_PREDICATE = 'src port';
const DST_PORT_BPF_PREDICATE = 'dst port';
const IP_PROTO_BPF_PREDICATE = 'ip proto';
const COMMUNITY_ID_BPF_PREDICATE = 'cid';
const FILTER_INTERFACE_BPF_PREDICATE = 'filter-interface';
const SRC_MAC_ADDR_BPF_PREDICATE = 'src mac';
const DST_MAC_ADDR_BPF_PREDICATE = 'dst mac';
const POLICY_NAME_BPF_PREDICATE = 'policy';
const VLAN_TAG_BPF_PREDICATE = 'vlan';
const VLAN_INNER_TAG_BPF_PREDICATE = 'inner inner vlan';
const VLAN_MIDDLE_TAG_BPF_PREDICATE = 'inner vlan';
const VLAN_OUTER_TAG_BPF_PREDICATE = 'outer vlan';
const MW_DEVICE_ID_BPF_PREDICATE = 'mw device-id';
const MW_PORT_ID_BPF_PREDICATE = 'mw port-id';

function formBPFFilterTwoPredicate(predicate1, value1, predicate2, value2) {
  if (predicate1 && predicate2 && value1 && value2) {
    return (
      '(' +
      predicate1 +
      ' ' +
      value1 +
      ' or ' +
      predicate2 +
      ' ' +
      value1 +
      ')' +
      ' and ' +
      '(' +
      predicate1 +
      ' ' +
      value2 +
      ' or ' +
      predicate2 +
      ' ' +
      value2 +
      ')'
    );
  }
  return '';
}

function formBPFFilterOnePredicate(predicate1, value1) {
  if (predicate1 && value1) {
    return predicate1 + ' ' + value1;
  }
  return '';
}

function formBPFFilterIpPredicate(ip, type) {
  if (ip.match(IPv4_CIDR_REGEX) || ip.match(IPv6_CIDR_REGEX)) {
    let predicate =
      type == 'src' ? SRC_NET_BPF_PREDICATE : DST_NET_BPF_PREDICATE;
    return formBPFFilterOnePredicate(predicate, ip);
  } else if (ip.match(IPv4_REGEX) || ip.match(IPv6_REGEX)) {
    let predicate =
      type == 'src' ? SRC_HOST_BPF_PREDICATE : DST_HOST_BPF_PREDICATE;
    return formBPFFilterOnePredicate(predicate, ip);
  }
}

function formBPFFilterIpsPredicate(ips, type) {
  let ipBPFFilters = [];
  for (let i = 0; i < ips.length; i++) {
    ipBPFFilters.push(formBPFFilterIpPredicate(ips[i], type));
  }
  return ipBPFFilters.join(' or ');
}

function formBidrectionalBpfPredicate(predicate1, value1, predicate2, value2) {
  return [
    formBPFFilterOnePredicate(predicate1, value1),
    formBPFFilterOnePredicate(predicate2, value2)
  ].join(' or ');
}

function formBidrectionalBpfMultiPredicate(
  items,
  SRC_PREDICATE,
  DST_PREDICATE
) {
  let bpfFilters = [];
  for (let i = 0; i < items.length; i++) {
    bpfFilters.push(
      formBidrectionalBpfPredicate(
        SRC_PREDICATE,
        items[i],
        DST_PREDICATE,
        items[i]
      )
    );
  }
  return bpfFilters.join(' or ');
}

function formBpfMultiPredicate(items, PREDICATE) {
  let bpfFilters = [];
  for (let i = 0; i < items.length; i++) {
    bpfFilters.push(formBPFFilterOnePredicate(PREDICATE, items[i]));
  }
  return bpfFilters.join(' or ');
}

function indexIntoDictionary(fromArray, toDict, marker) {
  for (let key of fromArray) {
    if (!toDict[key]) {
      toDict[key] = {};
    }
    toDict[key][marker] = true;
  }
}

export function formPacketRecorderData(filters) {
  let str = '';
  if (filters.start && filters.end) {
    str = str + '(' + filters.start + ' and ' + filters.end + ')';
  } else if (filters.start) {
    str = str + filters.start;
  }

  if (filters.community_id) {
    str = str + ' and ';
    str =
      str +
      formBPFFilterOnePredicate(
        COMMUNITY_ID_BPF_PREDICATE,
        filters.community_id
      );
    return str;
  }

  if (filters.mwDeviceId) {
    str = str + ' and ';
    str =
      str +
      formBPFFilterOnePredicate(
        MW_DEVICE_ID_BPF_PREDICATE,
        filters.mwDeviceId
      );
  }

  if (filters.mwPortId) {
    str = str + ' and ';
    str =
      str +
      formBPFFilterOnePredicate(
        MW_PORT_ID_BPF_PREDICATE,
        filters.mwPortId
      );
  }

  if (filters.bidirection) {
    if (filters.srcIps.length > 0 && filters.dstIps.length > 0) {
      str = str + ' and ';
      str = str + '((' + formBPFFilterIpsPredicate(filters.srcIps, 'src');
      str = str + ' and ';
      str = str + formBPFFilterIpsPredicate(filters.dstIps, 'dst') + ')';
      str = str + ' or ';
      str = str + '(' + formBPFFilterIpsPredicate(filters.dstIps, 'src');
      str = str + ' and ';
      str = str + formBPFFilterIpsPredicate(filters.srcIps, 'dst') + '))';
    } else if (filters.srcIps.length > 0 || filters.dstIps.length > 0) {
      let ips = filters.srcIps.length
        ? filters.srcIps
        : filters.dstIps.length
        ? filters.dstIps
        : [];
      str = str + ' and ';
      str = str + '(' + formBPFFilterIpsPredicate(ips, 'src');
      str = str + ' or ';
      str = str + formBPFFilterIpsPredicate(ips, 'dst') + ')';
    }
    if (filters.srcMacAddrs && filters.srcMacAddrs.length > 0) {
      str = str + ' and ';
      str =
        str +
        '(' +
        formBidrectionalBpfMultiPredicate(
          filters.srcMacAddrs,
          SRC_MAC_ADDR_BPF_PREDICATE,
          DST_MAC_ADDR_BPF_PREDICATE
        ) +
        ')';
    }
    if (filters.dstMacAddrs && filters.dstMacAddrs.length > 0) {
      str = str + ' and ';
      str =
        str +
        '(' +
        formBidrectionalBpfMultiPredicate(
          filters.dstMacAddrs,
          SRC_MAC_ADDR_BPF_PREDICATE,
          DST_MAC_ADDR_BPF_PREDICATE
        ) +
        ')';
    }
    if (filters.srcPorts && filters.srcPorts.length > 0) {
      str = str + ' and ';
      str =
        str +
        '(' +
        formBidrectionalBpfMultiPredicate(
          filters.srcPorts,
          SRC_PORT_BPF_PREDICATE,
          DST_PORT_BPF_PREDICATE
        ) +
        ')';
    }
    if (filters.dstPorts && filters.dstPorts.length > 0) {
      str = str + ' and ';
      str =
        str +
        '(' +
        formBidrectionalBpfMultiPredicate(
          filters.dstPorts,
          SRC_PORT_BPF_PREDICATE,
          DST_PORT_BPF_PREDICATE
        ) +
        ')';
    }
  } else {
    if (filters.srcIps.length > 0) {
      str = str + ' and ';
      str = str + '(' + formBPFFilterIpsPredicate(filters.srcIps, 'src') + ')';
    }
    if (filters.dstIps.length > 0) {
      str = str + ' and ';
      str = str + '(' + formBPFFilterIpsPredicate(filters.dstIps, 'dst') + ')';
    }
    if (filters.srcMacAddrs && filters.srcMacAddrs.length > 0) {
      str = str + ' and ';
      str =
        str +
        '(' +
        formBpfMultiPredicate(filters.srcMacAddrs, SRC_MAC_ADDR_BPF_PREDICATE) +
        ')';
    }
    if (filters.dstMacAddrs && filters.dstMacAddrs.length > 0) {
      str = str + ' and ';
      str =
        str +
        '(' +
        formBpfMultiPredicate(filters.dstMacAddrs, DST_MAC_ADDR_BPF_PREDICATE) +
        ')';
    }
    if (filters.srcPorts && filters.srcPorts.length > 0) {
      str = str + ' and ';
      str =
        str +
        '(' +
        formBpfMultiPredicate(filters.srcPorts, SRC_PORT_BPF_PREDICATE) +
        ')';
    }
    if (filters.dstPorts && filters.dstPorts.length > 0) {
      str = str + ' and ';
      str =
        str +
        '(' +
        formBpfMultiPredicate(filters.dstPorts, DST_PORT_BPF_PREDICATE) +
        ')';
    }
  }

  if (filters.proto) {
    str =
      str +
      ' and ' +
      formBPFFilterOnePredicate(IP_PROTO_BPF_PREDICATE, filters.proto);
  }

  if (filters.btFilterInterfaces && filters.btFilterInterfaces.length > 0) {
    str = str + ' and ';
    str =
      str +
      '(' +
      formBpfMultiPredicate(
        filters.btFilterInterfaces,
        FILTER_INTERFACE_BPF_PREDICATE
      ) +
      ')';
  }

  if (filters.btPolicyNames && filters.btPolicyNames.length > 0) {
    str = str + ' and ';
    str =
      str +
      '(' +
      formBpfMultiPredicate(filters.btPolicyNames, POLICY_NAME_BPF_PREDICATE) +
      ')';
  }

  // Dedup vlanTags
  let vlanDict = {};
  indexIntoDictionary(filters.vlanTags, vlanDict, 'all');
  indexIntoDictionary(filters.vlanInnerTags, vlanDict, 'inner');
  indexIntoDictionary(filters.vlanMiddleTags, vlanDict, 'middle');
  indexIntoDictionary(filters.vlanOuterTags, vlanDict, 'outer');

  let dedupVlan = filters.vlanTags ? filters.vlanTags : [],
    dedupVlanInner = [],
    dedupVlanMiddle = [],
    dedupVlanOuter = [];
  for (const [vlanTag, tagType] of Object.entries(vlanDict)) {
    if (!tagType.all) {
      if (tagType.inner && tagType.middle && tagType.outer) {
        dedupVlan.push(vlanTag);
      } else {
        if (tagType.inner) {
          dedupVlanInner.push(vlanTag);
        }
        if (tagType.middle) {
          dedupVlanMiddle.push(vlanTag);
        }
        if (tagType.outer) {
          dedupVlanOuter.push(vlanTag);
        }
      }
    }
  }

  if (dedupVlan.length > 0) {
    str = str + ' and ';
    str =
      str +
      '(' +
      formBpfMultiPredicate(dedupVlan, VLAN_TAG_BPF_PREDICATE) +
      ')';
  }

  if (dedupVlanInner.length > 0) {
    str = str + ' and ';
    str =
      str +
      '(' +
      formBpfMultiPredicate(dedupVlanInner, VLAN_INNER_TAG_BPF_PREDICATE) +
      ')';
  }

  if (dedupVlanMiddle.length > 0) {
    str = str + ' and ';
    str =
      str +
      '(' +
      formBpfMultiPredicate(dedupVlanMiddle, VLAN_MIDDLE_TAG_BPF_PREDICATE) +
      ')';
  }

  if (dedupVlanOuter.length > 0) {
    str = str + ' and ';
    str =
      str +
      '(' +
      formBpfMultiPredicate(dedupVlanOuter, VLAN_OUTER_TAG_BPF_PREDICATE) +
      ')';
  }

  return str;
}
