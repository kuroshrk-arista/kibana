import React, { Fragment } from 'react';
import dateMath from '@elastic/datemath';
import { indexOf, isEmpty, isEqual, keys, map, toLower, sortBy, isArray, reduce } from 'lodash';

import {
  EuiButtonGroup,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiSuperDatePicker,
  EuiComboBox,
  EuiButton,
  EuiButtonEmpty,
  EuiSwitch,
  EuiPopover,
  EuiPopoverTitle,
  EuiAccordion,
  EuiFlexGrid,
  EuiRange,
  EuiSelect,
  EuiFormLabel,
  EuiText,
  EuiFieldNumber,
  EuiNotificationBadge
} from '@elastic/eui';
import {
  IPv4_AND_CIDR_NEW_REGEX,
  IPv6_CIDR_REGEX,
  IPv6_REGEX,
  MAC_ADDRESS_REGEX,
  COMMUNITY_ID_REGEX
} from '../../common/utils/constants';

class SearchPage extends React.Component {
  constructor(props) {
    super(props);
    this.data = props.data;
    const dashboardTimeFilter = props.timeFilter;

    // if there is a search cached, return to the same filters
    if (this.props.previousFilters !== null) {
      this.state = this.props.previousFilters;
    } else {
      this.state = {
        start: isEmpty(dashboardTimeFilter)
          ? 'now-5m'
          : dashboardTimeFilter.from,
        end: isEmpty(dashboardTimeFilter) ? 'now' : dashboardTimeFilter.to,
        srcIps: [],
        srcIpInvalid: false,
        srcMacs: [],
        srcMacInvalid: false,
        destIps: [],
        destIpInvalid: false,
        destMacs: [],
        destMacInvalid: false,
        srcPorts: [],
        srcPortInvalid: false,
        destPorts: [],
        destPortInvalid: false,
        isSrc: true,
        bidirectional: true,
        protocol: '',
        communityId: '',
        communityIdInvalid: false,
        btFilterInterfaces: [],
        btPolicyNames: [],
        vlanTags: [],
        vlanInnerTags: [],
        vlanOuterTags: [],
        vlanMiddleTags: [],
        isPopoverOpenSrc: false,
        isPopoverOpenDest: false,
        selectedSearchType: 'size',
        maxSize: 0,
        maxPackets: 0,
        mwDeviceId: '',
        mwPortId: '',
        packetRecorders: [],
        isPopoverOpenBMF: false,
        selectedFlowAnalysisType: 'analysis-tcp-flow-health',
        deliveryInterface: '',
        interval: 30000
      };
    }

    this.searchTypeButtons = [
      {
        id: 'size',
        label: 'Size'
      },
      {
        id: 'appid',
        label: 'AppID'
      },
      {
        id: 'packets',
        label: 'Packet Data'
      },
      {
        id: 'packet-objects',
        label: 'Packet Objects'
      },
      {
        id: 'replay',
        label: 'Replay'
      },
      {
        id: 'flowanalysis',
        label: 'Flow Analysis'
      }
      // {
      //   id: 'trends',
      //   label: 'Trends'
      // }
    ];

    this.flowAnalysisTypes = [
      { value: 'analysis-http-tree', text: 'HTTP' },
      { value: 'analysis-http-req-tree', text: 'HTTP Request' },
      { value: 'analysis-dns-tree', text: 'DNS' },
      { value: 'analysis-hosts', text: 'Hosts' },
      { value: 'analysis-conv-ipv4', text: 'IPv4' },
      { value: 'analysis-conv-ipv6', text: 'IPv6' },
      { value: 'analysis-conv-tcp', text: 'TCP' },
      { value: 'analysis-tcp-flow-health', text: 'TCP Flow Health' },
      { value: 'analysis-conv-udp', text: 'UDP' },
      { value: 'analysis-rtp-streams', text: 'RTP Streams' },
      { value: 'analysis-conv-sip', text: 'SIP Correlate' },
      { value: 'analysis-sip-stat', text: 'SIP Health' }
    ];

    this.timePickerRanges = [
      { start: 'now/w', end: 'now', label: 'Week to date' },
      { start: 'now/M', end: 'now', label: 'Month to date' },
      { start: 'now/y', end: 'now', label: 'Year to date' }
    ];

    this.ports = keys(props.ports);

    this.packetRecorders = [];
    this.policies = [];
    this.filterInterfaces = [];

    this.getDeliveryInterfaces();
    this.updateSubscription = null;
  }

  setUpFiltersOnMount = () => {
    // wrapper for connecting the filter to the name of the variable in SearchPage's state
    const wrapper = (filter, stateName) => {
      // The first time the component mounts, we want to try to update the filters that come through
      // The map turns the src ips into an array of just the labels, then sees if it already exists so not to duplicate it
      const existingFilters = this.state[stateName].map((el) => el.label);

      if (isArray(filter)) {
        const diffFilters = reduce(
          filter,
          (result, item) => {
            if (existingFilters.indexOf(item) === -1) {
              result.push({ label: item });
            }
            return result;
          },
          []
        );
        this.setState((state) => {
          return { [stateName]: state[stateName].concat(diffFilters) };
        });
      } else if (filter !== '' && existingFilters.indexOf(filter) === -1) {
        this.setState((state) => {
          return { [stateName]: state[stateName].concat([{ label: filter }]) };
        });
      }
    };

    const {
      sIp,
      dIp,
      sMac,
      dMac,
      community_id,
      sPorts,
      dPorts,
      biDir,
      BTifName,
      protocol
    } = this.props;
    const { srcPorts, destPorts } = this.state;

    wrapper(sIp, 'srcIps');
    wrapper(dIp, 'destIps');
    wrapper(sMac, 'srcMacs');
    wrapper(dMac, 'destMacs');
    wrapper(sPorts, 'srcPorts');
    wrapper(dPorts, 'destPorts');
    wrapper(BTifName, 'btFilterInterfaces');

    // set rest of fields
    if (community_id !== '') {
      this.setState({ communityId: community_id });
    }
    if (protocol !== '') {
      this.setState({ protocol: protocol });
    }
    this.setState({ bidirectional: biDir });
  };

  componentDidMount() {
    this.setUpFiltersOnMount();
    this.getPacketRecorders();
    this.getPolicies();
    this.getFilterInterfaces();

    if( this.deps ){
      const updateObservable = this.deps.data.query.timefilter.timefilter.getTimeUpdate$();
      this.updateSubscription = updateObservable.subscribe(this.updateTimeFilter);
    }
  }

  componentWillUnmount() {
    if( this.updateSubpscription ){
      this.updateSubscription.unsubscribe();
      this.updateSubscription = null;
    }
  }

  updateTimeFilter = () => {
    const time = this.deps.data.query.timefilter.timefilter.getTime();

    if (!isEmpty(time)) {
      this.setState({
        start: time.from,
        end: time.to
      });
    }
  };

  getPacketRecorders() {
    this.props.BMFController.getPacketRecorders()
      .then((res) => {
        const packetRecorders = res.data;
        if (packetRecorders.length === 0) {
          const errToast = {
            id: 'packet-recorder-not-configured',
            title: 'Controller Warning',
            color: 'warning',
            iconType: 'alert',
            text: (
              <p>
                No configured recorder nodes have been discovered on this
                controller.
              </p>
            )
          };
          this.props.displayToasts([errToast]);
        } else {
          this.packetRecorders = sortBy(map(packetRecorders, (obj) => ({
            label: obj.name
          })), [(item) => toLower(item.label)]);
        }
      })
      .catch((err) => {});
  }

  getPolicies() {
    this.props.BMFController.getPolicies()
      .then((res) => {
        const policies = res.data;
        if (policies.length === 0) {
          const errToast = {
            id: 'policies-not-configured',
            title: 'Controller Warning',
            color: 'warning',
            iconType: 'alert',
            text: (
              <p>
                No configured policies have been discovered on this
                controller.
              </p>
            )
          };
          this.props.displayToasts([errToast]);
        } else {
          this.policies = sortBy(map(policies, (obj) => ({
            label: obj.name
          })), [(item) => toLower(item.label)]);
        }
      })
      .catch((err) => {});
  }

  getFilterInterfaces() {
    this.props.BMFController.getFilterInterfaces()
      .then((res) => {
        const filterInterfaces = res.data;
        if (filterInterfaces.length === 0) {
          const errToast = {
            id: 'filter-interfaces-not-configured',
            title: 'Controller Warning',
            color: 'warning',
            iconType: 'alert',
            text: (
              <p>
                No configured filter interfaces have been discovered on this
                controller.
              </p>
            )
          };
          this.props.displayToasts([errToast]);
        } else {
          this.filterInterfaces = sortBy(map(filterInterfaces, (obj) => ({
            label: obj['dmf-interface']
          })), [(item) => toLower(item.label)]);
        }
      })
      .catch((err) => {});
  }

  getValues(values) {
    if (values === '') {
      return [];
    } else if (isArray(values)) {
      return values.map((item) => ({ label: item }));
    } else {
      return [{ label: values }];
    }
  }

  componentDidUpdate(prevProps) {
    // The following logic checks for filters from the kibana dashboard
    // It updates/removes filters as they get updated
    const updateObject = {};
    let update = false;
    if (prevProps.sIp !== this.props.sIp) {
      updateObject.srcIps = this.getValues(this.props.sIp);
      update = true;
    }
    if (this.props.dIp !== prevProps.dIp) {
      updateObject.destIps = this.getValues(this.props.dIp);
      update = true;
    }
    if (this.props.community_id !== prevProps.community_id) {
      updateObject.communityId = this.props.community_id;
      update = true;
    }
    if (!isEqual(this.props.sPorts, prevProps.sPorts)) {
      updateObject.srcPorts = this.getValues(this.props.sPorts);
      update = true;
    }
    if (!isEqual(this.props.dPorts, prevProps.dPorts)) {
      updateObject.destPorts = this.getValues(this.props.dPorts);
      update = true;
    }
    if (!isEqual(this.props.BTifName, prevProps.BTifName)) {
      updateObject.btFilterInterfaces = this.getValues(this.props.BTifName);
      update = true;
    }
    if (this.props.biDir !== prevProps.biDir) {
      updateObject.bidirectional = this.props.biDir;
      update = true;
    }
    if (this.props.protocol !== prevProps.protocol) {
      updateObject.protocol = this.props.protocol;
      update = true;
    }
    if (! isEqual(this.props.timeFilter, prevProps.timeFilter)) {
      updateObject.start = isEmpty(this.props.timeFilter) ? 'now-5m'
                                                          : this.props.timeFilter.from;
      updateObject.end = isEmpty(this.props.timeFilter) ? 'now' : this.props.timeFilter.to;
      update = true;
    }
    if (update) this.setState(updateObject);
  }

  /* Get the available interfaces for replay from the controller
    and add them to this.deliveryInterfaces in the format required for
    displaying them using EuiSelect
  */
  getDeliveryInterfaces = () => {
    this.props.BMFController.getDeliveryInterfaces()
      .then((res) => {
        const temp = [];
        res.data.forEach((interfaceObject) => {
          const option = {
            value: interfaceObject['dmf-interface'],
            text: interfaceObject['dmf-interface']
          };
          temp.push(option);
        });
        this.deliveryInterfaces = sortBy(temp, [(item) => toLower(item.text)]);
        // then set a default interface selection in our state
        if (temp.length > 0) {
          this.setState({ deliveryInterface: temp[0].value });
        }
      })
      .catch((err) => {
        // console.log(err);
      });
  };

  isValidIp = (ip) => {
    return (
      ip.match(IPv4_AND_CIDR_NEW_REGEX) !== null ||
      ip.match(IPv4_AND_CIDR_NEW_REGEX) !== null ||
      ip.match(IPv6_CIDR_REGEX) !== null ||
      ip.match(IPv6_REGEX) !== null
    );
  };

  onTimeChange = (window) => {
    if (window.isInvalid) {
      // do nothing? not sure
      return;
    }
    this.setState({
      start: window.start,
      end: window.end
    });
  };

  onCreateOptionIp = (value) => {
    if (!this.isValidIp(value)) {
      return false; // reject value because not valid IP
    }

    const newOption = {
      label: value
    };

    // the if statement is to determine whether we're configuring Source
    // or Destination
    this.setState((prevState) => {
      if (this.state.isSrc) {
        return { srcIps: prevState.srcIps.concat(newOption) };
      } else {
        return { destIps: prevState.destIps.concat(newOption) };
      }
    });
  };

  onSearchChangeIp = (searchValue) => {
    const { isSrc } = this.state;
    const stateAttr = isSrc ? 'srcIpInvalid' : 'destIpInvalid';

    if (!searchValue) {
      this.setState({
        [stateAttr]: false
      });

      return;
    }

    this.setState({
      [stateAttr]: !this.isValidIp(searchValue)
    });
  };

  // same as before, it depending on whether its src or dest
  onChangeIp = (ips) => {
    if (this.state.isSrc) {
      this.setState({
        srcIps: ips,
        srcIpInvalid: false
      });
    } else {
      this.setState({
        destIps: ips,
        destIpInvalid: false
      });
    }
  };

  isValidMac(mac) {
    return mac.match(MAC_ADDRESS_REGEX);
  }

  onSearchChangeMac = (searchValue) => {
    const { isSrc } = this.state;
    const stateAttr = isSrc ? 'srcMacInvalid' : 'destMacInvalid';

    if (!searchValue) {
      this.setState({
        [stateAttr]: false
      });

      return;
    }

    this.setState({
      [stateAttr]: !this.isValidMac(searchValue)
    });
  };

  onCreateOptionMac = (value) => {
    if (value.length === 0) {
      return false; // reject  if empty
    }

    if (!this.isValidMac(value)) {
      return false;
    }

    const newOption = {
      label: value
    };

    // the if statement is to determine whether we're configuring Source
    // or Destination
    this.setState((prevState) => {
      if (this.state.isSrc) {
        return { srcMacs: prevState.srcMacs.concat(newOption) };
      } else {
        return { destMacs: prevState.destMacs.concat(newOption) };
      }
    });
  };

  isValidPort(port) {
    if (isNaN(port)) {
      return indexOf(this.ports, toLower(port)) !== -1;
    }

    return true;
  }

  onSearchChangePort = (searchValue) => {
    const { isSrc } = this.state;
    const stateAttr = isSrc ? 'srcPortInvalid' : 'destPortInvalid';

    if (!searchValue) {
      this.setState({
        [stateAttr]: false
      });

      return;
    }

    this.setState({
      [stateAttr]: !this.isValidPort(searchValue)
    });
  };

  onCreateOptionPort = (value) => {
    if (value.length === 0) {
      return false; // reject  if empty
    }

    if (!this.isValidPort(value)) {
      return false;
    }

    const newOption = {
      label: value
    };

    // the if statement is to determine whether we're configuring Source
    // or Destination
    this.setState((prevState) => {
      if (this.state.isSrc) {
        return { srcPorts: prevState.srcPorts.concat(newOption) };
      } else {
        return { destPorts: prevState.destPorts.concat(newOption) };
      }
    });
  };

  // Returns the title associated with that id
  // ie. flowanalysis -> Flow Analysis
  getSelectedTitle = () => {
    let res = '';
    this.searchTypeButtons.forEach((button) => {
      if (button.id === this.state.selectedSearchType) {
        res = button.label;
      }
    });
    return res;
  };

  onChangeMac = (macs) => {
    if (this.state.isSrc) {
      this.setState({
        srcMacs: macs,
        srcMacInvalid: false
      });
    } else {
      this.setState({
        destMacs: macs,
        destMacInvalid: false
      });
    }
  };

  onChangePort = (ports) => {
    // if we're inputting source information
    if (this.state.isSrc) {
      this.setState({ srcPorts: ports });
    } else {
      // if we're inputting destination information
      this.setState({ destPorts: ports });
    }
  };

  onChangeSrc = () => {
    this.setState((prevState) => ({
      isSrc: !prevState.isSrc
    }));
  };

  onChangeProtocol = (e) => {
    this.setState({ protocol: e.target.value });
  };

  isValidCommunityId(communityId) {
    return communityId === '' || communityId.match(COMMUNITY_ID_REGEX);
  }

  onChangeCommunityId = (e) => {
    const communityId = e.target.value;

    this.setState({
      communityId,
      communityIdInvalid: !this.isValidCommunityId(communityId)
    });
  };

  onChangeBidirectional = (e) => {
    this.setState({ bidirectional: e.target.checked });
  };

  onSubmit = () => {
    // first find which search function to used based
    //  on the selected search
    let searchFunction;
    switch (this.state.selectedSearchType) {
      case 'size':
        searchFunction = this.props.getSummary;
        break;
      case 'appid':
        searchFunction = this.props.getAppID;
        break;
      case 'packets':
        searchFunction = this.props.getPackets;
        break;
      case 'packet-objects':
        searchFunction = this.props.getPacketObjects;
        break;
      case 'replay':
        searchFunction = this.props.getReplay;
        break;
      case 'flowanalysis':
        searchFunction = this.props.getFlowAnalysis;
        break;
      case 'trends':
        searchFunction = this.props.getIntervalAnalysis;
        break;
      default:
        throw 'Error, no recognized search selected';
    }

    // convert time from relative to absolute(if needed)
    this.setState(
      (prevState) => ({
        start: dateMath.parse(prevState.start).format(),
        end: dateMath.parse(prevState.end).format()
      }),
      // after setting correct time, submit search
      () => {
        this.props.onSubmitSearch(this.state, searchFunction);
      }
    );
  };

  closePopoverSrc = () => {
    this.setState({ isPopoverOpenSrc: false });
  };

  closePopoverDest = () => {
    this.setState({ isPopoverOpenDest: false });
  };

  onButtonClickSrc = () => {
    this.setState({
      isPopoverOpenSrc: !this.state.isPopoverOpenSrc,
      isSrc: true
    });
  };

  onButtonClickDest = () => {
    this.setState({
      isPopoverOpenDest: !this.state.isPopoverOpenDest,
      isSrc: false
    });
  };

  onButtonClickBMF = () => {
    this.setState({
      isPopoverOpenBMF: !this.state.isPopoverOpenBMF,
      isSrc: false
    });
  };

  closePopoverBMF = () => {
    this.setState({ isPopoverOpenBMF: false });
  };

  onChangeSearchType = (type) => {
    this.setState({ selectedSearchType: type });
  };

  onChangeDeliveryInterface = (e) => {
    this.setState({ deliveryInterface: e.target.value });
  };

  getQueryPreview = () => {
    return this.props.getQueryPreview(this.state);
  };

  // The ElasticUI Combo Box Component doesn't expose the component name(just value),
  // thus, instead of having just one function for all combo boxes,
  // we're forced to create a new set of functions for each combo boxes...
  // ... sorry
  onCreateOptionVlan = (value) => {
    this.setState((prevState) => {
      return { vlanTags: prevState.vlanTags.concat({ label: value }) };
    });
  };

  onChangeVlan = (tags) => {
    this.setState({
      vlanTags: tags
    });
  };

  onCreateOptionVlanMiddle = (value) => {
    this.setState((prevState) => {
      return {
        vlanMiddleTags: prevState.vlanMiddleTags.concat({ label: value })
      };
    });
  };

  onChangeVlanMiddle = (tags) => {
    this.setState({
      vlanMiddleTags: tags
    });
  };

  onCreateOptionVlanOuter = (value) => {
    this.setState((prevState) => {
      return {
        vlanOuterTags: prevState.vlanOuterTags.concat({ label: value })
      };
    });
  };

  onChangeVlanOuter = (tags) => {
    this.setState({
      vlanOuterTags: tags
    });
  };

  onCreateOptionVlanInner = (value) => {
    this.setState((prevState) => {
      return {
        vlanInnerTags: prevState.vlanInnerTags.concat({ label: value })
      };
    });
  };

  onChangeVlanInner = (tags) => {
    this.setState({
      vlanInnerTags: tags
    });
  };

  onChangeInterfaces = (tags) => {
    this.setState({
      btFilterInterfaces: tags
    });
  };

  onChangePolicy = (tags) => {
    this.setState({
      btPolicyNames: tags
    });
  };

  onChangePacketRecorder = (tags) => {
    this.setState({
      packetRecorders: tags
    });
  };

  onChangeMaxSize = (e) => {
    this.setState({ maxSize: e.target.value });
  };

  onChangeMaxPackets = (e) => {
    this.setState({ maxPackets: e.target.value });
  };

  onChangeMwDeviceId = (e) => {
    this.setState({ mwDeviceId: parseInt(e.target.value) });
  };

  onChangeMwPortId = (e) => {
    this.setState({ mwPortId: parseInt(e.target.value) });
  };

  onChangeFlowAnalysis = (e) => {
    this.setState({ selectedFlowAnalysisType: e.target.value });
  };

  onChangeInterval = (e) => {
    const sanitizedValue = parseInt(e.target.value, 10);
    this.setState({
      interval: isNaN(sanitizedValue) ? 30000 : sanitizedValue
    });
  };

  getSrcLength = () => {
    return (
      this.state.srcIps.length +
      this.state.srcMacs.length +
      this.state.srcPorts.length
    );
  };

  getDestLength = () => {
    return (
      this.state.destIps.length +
      this.state.destMacs.length +
      this.state.destPorts.length
    );
  };

  getAdditionalParametersLength = () => {
    const {
      vlanInnerTags,
      vlanMiddleTags,
      vlanOuterTags,
      vlanTags,
      btFilterInterfaces,
      btPolicyNames,
      mwDeviceId,
      mwPortId,
      packetRecorders,
      maxSize,
      maxPackets
    } = this.state;
    let count =
      vlanInnerTags.length +
      vlanMiddleTags.length +
      vlanOuterTags.length +
      vlanTags.length +
      btFilterInterfaces.length +
      btPolicyNames.length +
      packetRecorders.length;
    for (var param of [mwDeviceId, mwPortId, maxSize, maxPackets]) {
      if (param) {
        count++;
      }
    }
    return count;
  };

  onClear = () => {
    // set the defaults
    this.setState({
      start: 'now-5m',
      end: 'now',
      srcIps: [],
      srcIpInvalid: false,
      srcMacs: [],
      srcMacInvalid: false,
      destIps: [],
      destIpInvalid: false,
      destMacs: [],
      destMacInvalid: false,
      srcPorts: [],
      srcPortInvalid: false,
      destPorts: [],
      destPortInvalid: false,
      isSrc: true,
      bidirectional: true,
      protocol: '',
      communityId: '',
      communityIdInvalid: false,
      btFilterInterfaces: [],
      btPolicyNames: [],
      vlanTags: [],
      vlanInnerTags: [],
      vlanOuterTags: [],
      vlanMiddleTags: [],
      isPopoverOpenSrc: false,
      isPopoverOpenDest: false,
      selectedSearchType: 'size',
      maxSize: 0,
      maxPackets: 0,
      mwDeviceId: null,
      mwPortId: null,
      packetRecorders: [],
      isPopoverOpenBMF: false,
      selectedFlowAnalysisType: 'analysis-tcp-flow-health',
      deliveryInterface: ''
    });
  };

  // Draw the preview stenographer query
  renderQueryPreview() {
    const buttonContent = (
      <EuiText>{'Query Preview: ' + this.getSelectedTitle()}</EuiText>
    );

    return (
      <EuiAccordion
        id="query-accordion"
        className="fullWidth maxWidth"
        buttonContent={buttonContent}
      >
        <EuiText>
          <p>{this.getQueryPreview()}</p>
          {this.state.selectedSearchType === 'replay' && (
            <p>Delivery Interface: {this.state.deliveryInterface}</p>
          )}
          {this.state.selectedSearchType === 'flowanalysis' && (
            <p>Flow Analysis Type: {this.state.selectedFlowAnalysisType}</p>
          )}
        </EuiText>
      </EuiAccordion>
    );
  }

  renderSelectComboBox() {
    const search = this.state.selectedSearchType;
    if (search === 'flowanalysis') {
      return (
        <EuiFlexItem grow={5}>
          <EuiSelect
            prepend={<EuiFormLabel>Flow Type</EuiFormLabel>}
            options={this.flowAnalysisTypes}
            value={this.state.selectedFlowAnalysisType}
            onChange={this.onChangeFlowAnalysis}
          />
        </EuiFlexItem>
      );
    } else if (search === 'replay') {
      return (
        <EuiFlexItem grow={5}>
          <EuiSelect
            prepend={<EuiFormLabel>Delivery Interface</EuiFormLabel>}
            options={this.deliveryInterfaces}
            value={this.state.deliveryInterface}
            onChange={this.onChangeDeliveryInterface}
          />
        </EuiFlexItem>
      );
    } else if (search === 'trends') {
      return (
        <EuiFieldNumber
          placeholder="Interval Size"
          value={this.state.interval}
          onChange={this.onChangeInterval}
          aria-label="Interval size"
          min={1000}
          append={
            <EuiText size="xs">
              <strong>ms</strong>
            </EuiText>
          }
        />
      );
    } else {
      return (
        <EuiFlexItem grow={5}>
          <EuiSelect disabled={true} />
        </EuiFlexItem>
      );
    }
  }

  renderBMFParameters = () => {
    return (
      <EuiFlexGrid gutterSize="s" className="fullWidth custom-grid" columns={4}>
        <EuiFlexItem>
          <EuiFormRow label="VLAN">
            <EuiComboBox
              noSuggestions
              selectedOptions={this.state.vlanTags}
              onCreateOption={this.onCreateOptionVlan}
              onChange={this.onChangeVlan}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Outer VLAN">
            <EuiComboBox
              noSuggestions
              selectedOptions={this.state.vlanOuterTags}
              onCreateOption={this.onCreateOptionVlanOuter}
              onChange={this.onChangeVlanOuter}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Inner/Middle VLAN">
            <EuiComboBox
              noSuggestions
              selectedOptions={this.state.vlanMiddleTags}
              onCreateOption={this.onCreateOptionVlanMiddle}
              onChange={this.onChangeVlanMiddle}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Innermost VLAN">
            <EuiComboBox
              noSuggestions
              selectedOptions={this.state.vlanInnerTags}
              onCreateOption={this.onCreateOptionVlanInner}
              onChange={this.onChangeVlanInner}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Filter Interfaces">
            <EuiComboBox
              options={this.filterInterfaces}
              selectedOptions={this.state.btFilterInterfaces}
              onChange={this.onChangeInterfaces}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Policy Names">
            <EuiComboBox
              options={this.policies}
              selectedOptions={this.state.btPolicyNames}
              onChange={this.onChangePolicy}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label={'Max Size: ' + this.state.maxSize + 'MB'}>
            <EuiRange
              id="maxSize"
              min={0}
              max={100}
              step={1}
              value={this.state.maxSize}
              onChange={this.onChangeMaxSize}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              'Max Packets: ' + Number(this.state.maxPackets).toLocaleString()
            }
          >
            <EuiRange
              id="maxPackets"
              min={0}
              max={100000}
              step={10}
              value={this.state.maxPackets}
              onChange={this.onChangeMaxPackets}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="MetaWatch Device ID">
            <EuiFieldNumber
              min={0}
              max={65535}
              value={this.state.mwDeviceId}
              onChange={this.onChangeMwDeviceId}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="MetaWatch Port ID">
            <EuiFieldNumber
              min={0}
              max={255}
              value={this.state.mwPortId}
              onChange={this.onChangeMwPortId}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiFormRow label="Packet Recorders">
            <EuiComboBox
              options={this.packetRecorders}
              selectedOptions={this.state.packetRecorders}
              onChange={this.onChangePacketRecorder}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  };

  renderHostInfo = () => {
    const {
      isSrc,
      srcIpInvalid,
      destIpInvalid,
      srcMacInvalid,
      destMacInvalid,
      srcPortInvalid,
      destPortInvalid
    } = this.state;

    return (
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFormRow
          label="IP / CIDR Address"
          isInvalid={isSrc ? srcIpInvalid : destIpInvalid}
          error={
            (isSrc && srcIpInvalid) || (!isSrc && destIpInvalid)
              ? 'Please enter valid IP or CIDR'
              : undefined
          }
        >
          <EuiComboBox
            noSuggestions
            selectedOptions={isSrc ? this.state.srcIps : this.state.destIps}
            onCreateOption={this.onCreateOptionIp}
            onSearchChange={this.onSearchChangeIp}
            onChange={this.onChangeIp}
            isInvalid={isSrc ? srcIpInvalid : destIpInvalid}
          />
        </EuiFormRow>
        <EuiFormRow
          label="MAC Address"
          isInvalid={isSrc ? srcMacInvalid : destMacInvalid}
          error={
            (isSrc && srcMacInvalid) || (!isSrc && destMacInvalid)
              ? 'Please enter valid MAC Address'
              : undefined
          }
        >
          <EuiComboBox
            noSuggestions
            selectedOptions={isSrc ? this.state.srcMacs : this.state.destMacs}
            onCreateOption={this.onCreateOptionMac}
            onSearchChange={this.onSearchChangeMac}
            onChange={this.onChangeMac}
            isInvalid={isSrc ? srcMacInvalid : destMacInvalid}
          />
        </EuiFormRow>
        <EuiFormRow
          label="Port"
          isInvalid={isSrc ? srcPortInvalid : destPortInvalid}
          error={
            (isSrc && srcPortInvalid) || (!isSrc && destPortInvalid)
              ? 'Please enter valid port'
              : undefined
          }
        >
          <EuiComboBox
            noSuggestions
            selectedOptions={isSrc ? this.state.srcPorts : this.state.destPorts}
            onCreateOption={this.onCreateOptionPort}
            onSearchChange={this.onSearchChangePort}
            onChange={this.onChangePort}
            isInvalid={isSrc ? srcPortInvalid : destPortInvalid}
          />
        </EuiFormRow>
      </EuiFlexGroup>
    );
  };

  renderSearchForm = () => {
    const srcInfoCount = this.getSrcLength();
    const destInfoCount = this.getDestLength();
    const additionalParamsCount = this.getAdditionalParametersLength();

    return (
      <EuiFlexGroup direction="column" gutterSize="xs" alignItems="center">
        <EuiButtonGroup
          label="Query Type"
          color="primary"
          options={this.searchTypeButtons}
          idSelected={this.state.selectedSearchType}
          onChange={this.onChangeSearchType}
          className="fullWidth"
        />

        <EuiSpacer size="m" />

        {/* <EuiTitle size="xs">
          <h2>Select a time</h2>
        </EuiTitle> */}
        <EuiSuperDatePicker
          className="fullWidth"
          start={this.state.start}
          end={this.state.end}
          onTimeChange={this.onTimeChange}
          showUpdateButton={true}
          commonlyUsedRanges={this.timePickerRanges}
          fullWidth={true}
        />

        <EuiSpacer size="m" />

        <EuiFlexGroup
          wrap
          className="fullWidth"
          justifyContent="center"
          gutterSize="s"
        >
          <EuiFlexItem grow={5}>
            <EuiFieldText
              prepend={
                this.state.protocol ? (
                  <EuiFormLabel>Protocol #</EuiFormLabel>
                ) : (
                  ''
                )
              }
              placeholder="IP Protocol #"
              value={this.state.protocol}
              onChange={this.onChangeProtocol}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={5}>
            <EuiFormRow
              isInvalid={this.state.communityIdInvalid}
              error={
                this.state.communityIdInvalid
                  ? 'Please enter valid community ID'
                  : undefined
              }
            >
              <EuiFieldText
                append={
                  this.state.communityId ? (
                    <EuiFormLabel>Community ID</EuiFormLabel>
                  ) : (
                    ''
                  )
                }
                placeholder="Community ID"
                value={this.state.communityId}
                onChange={this.onChangeCommunityId}
                isInvalid={this.state.communityIdInvalid}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFlexGroup
          wrap
          className="fullWidth"
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="srcPop"
              ownFocus
              button={
                <EuiButton
                  iconType="arrowRight"
                  iconSide="right"
                  onClick={this.onButtonClickSrc}
                >
                  Source Info
                  {srcInfoCount > 0 && (
                    <EuiNotificationBadge>{srcInfoCount}</EuiNotificationBadge>
                  )}
                </EuiButton>
              }
              isOpen={this.state.isPopoverOpenSrc}
              closePopover={this.closePopoverSrc}
              anchorPosition="rightUp"
            >
              <EuiPopoverTitle>
                {this.state.isSrc ? 'Source Host' : 'Destination Host'}
              </EuiPopoverTitle>
              <div style={{ width: '300px' }}>{this.renderHostInfo()}</div>
            </EuiPopover>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSwitch
              label="Bi-directional"
              checked={this.state.bidirectional}
              onChange={this.onChangeBidirectional}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiPopover
              id="destPop"
              ownFocus
              button={
                <EuiButton
                  iconType="arrowLeft"
                  iconSide="left"
                  onClick={this.onButtonClickDest}
                >
                  {destInfoCount > 0 && (
                    <EuiNotificationBadge>{destInfoCount}</EuiNotificationBadge>
                  )}
                  Destination Info
                </EuiButton>
              }
              isOpen={this.state.isPopoverOpenDest}
              closePopover={this.closePopoverDest}
              anchorPosition="leftUp"
            >
              <EuiPopoverTitle>
                {this.state.isSrc ? 'Source Host' : 'Destination Host'}
              </EuiPopoverTitle>
              <div style={{ width: '300px' }}>{this.renderHostInfo()}</div>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFlexGroup
          gutterSize="s"
          className="fullWidth"
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={5}>
            <EuiPopover
              id="bmfPop"
              ownFocus
              button={
                <EuiButtonEmpty
                  iconType={
                    this.state.isPopoverOpenBMF ? 'arrowDown' : 'arrowRight'
                  }
                  iconSide="left"
                  onClick={this.onButtonClickBMF}
                >
                  Additional Parameters
                  {additionalParamsCount > 0 && (
                    <EuiNotificationBadge>
                      {additionalParamsCount}
                    </EuiNotificationBadge>
                  )}
                </EuiButtonEmpty>
              }
              isOpen={this.state.isPopoverOpenBMF}
              closePopover={this.closePopoverBMF}
              anchorPosition="downLeft"
              panelPaddingSize="s"
            >
              <div style={{ width: '558px' }}>{this.renderBMFParameters()}</div>
            </EuiPopover>
          </EuiFlexItem>

          {this.renderSelectComboBox()}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="s" className="fullWidth">
          <EuiFlexItem grow={2}>
            <EuiButton color="danger" onClick={this.props.onAbort}>
              Abort
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiButton onClick={this.onClear}>Clear</EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={6}>
            <EuiButton fill onClick={this.onSubmit}>
              Submit
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="l" className="fullWidth">
          <EuiFlexItem>{this.renderQueryPreview()}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  };

  // this function renders the tabs, and by clicking on each tab
  // it renders the specified render content defined in this.tabs
  render() {
    return <div>{this.renderSearchForm()}</div>;
  }
}

export default SearchPage;
