// This file determines which page of the visualization gets rendered
//   and handles the navigation betweem those pages
import './styles/styles.scss';
import React, { Fragment } from 'react';
import { find, forIn, head, indexOf, invert, map, toLower, uniq, isArray, isEqual } from 'lodash';
import moment from 'moment';
import ControllerLogin from './LoginPage';
import SearchPage from './SearchPage';
import { SizePage } from './ResultPages/SizePage';
import { AppIDPage } from './ResultPages/AppIDPage';
import { FlowAnalysisPage } from './ResultPages/FlowAnalysisPage';
import { RtpStreamTable } from './ResultPages/RtpStreamTable';
import { BMFController } from '../../common/utils/controller';
import { getValidIp } from '../../common/utils';
const axios = require('axios');

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiProgress,
  EuiText,
  EuiButtonEmpty,
  EuiSpacer,
  EuiTitle,
  EuiLink,
  EuiGlobalToastList,
  htmlIdGenerator
} from '@elastic/eui';
import { ControllerConfig } from './ControllerConfig';
import { DnsTable } from './ResultPages/DnsTable';
//import { EmbeddedPage } from './ResultPages/EmbeddedPage';
import { HttpTable } from './ResultPages/HttpTable';
import { HttpReqTable } from './ResultPages/HttpReqTable';
import { HostsTable } from './ResultPages/HostsTable';
import { IPTable } from './ResultPages/IPTable';
import { SipTable } from './ResultPages/SipTable';
import { SipStatTable } from './ResultPages/SipStatTable';
import { timingSafeEqual } from 'crypto';

const DATETIME_FORMAT = 'MMM Do YYYY, hh:mmA';

class MainContainer extends React.Component {
  constructor(props) {
    super(props);
    this.core = props.core;
    this.data = props.data;
    this.queryFilter = props.data.query.filterManager;

    // create a subscription for every time a filter is added to the dashboard.
    this.updateSubscription = this.queryFilter.getUpdates$().subscribe({
      next: () => {
        const filters = this.queryFilter.getFilters();
        this.updateAllFilters(filters);
      }
    });
    this.BMFController = new BMFController(this.core);

    this.state = {
      page: 0,
      window: {}, // defines the time limits based on recorder query for window
      previousFilters: null,
      asyncId: null,
      asyncProgressValue: 0,
      asyncProgressStatus: null,
      progressInterval: null,
      showProgressBar: false,
      progressValue: 0,
      progressTimeout: null,
      selectedSearchType: 'size',
      data: null, // the result from the search query to controller
      controllers: [],
      selectedController: '',
      autoLogin: true,
      toasts: [],
      progressCount: 0,
      sIp: '',
      dIp: '',
      sMac: '',
      dMac: '',
      sPorts: '',
      dPorts: '',
      community_id: '',
      BTifName: '',
      biDir: true,
      ports: {},
      protocol: '',
      timeFilter: props.data.query.timefilter.timefilter.getTime()
    };
  }

  updateAllFilters = (filters) => {
    this.updateFilters(filters, ['sIp'], 'sIp');
    this.updateFilters(filters, ['sP', 'sP.keyword'], 'sPorts');
    this.updateFilters(filters, ['dIp'], 'dIp');
    this.updateFilters(
      filters,
      ['dP', 'dP.keyword', 'l4App', 'l4App.keyword'],
      'dPorts'
    );
    this.updateFilters(filters, ['sMac'], 'sMac');
    this.updateFilters(filters, ['dMac'], 'dMac');
    this.updateFilters(filters, ['proto'], 'protocol');
    this.updateFilters(
      filters,
      ['community_id', 'community_id.keyword'],
      'community_id'
    );
    this.updateFilters(filters, ['BTifName', 'BTifName.keyword'], 'BTifName');
    this.updateFlowFilters(filters);
  };

  // Check to see if filter has been added or removed with the key [key],
  // and update the state based on that
  updateFilters = (filters, filterKeys, queryKey) => {
    let found = false;
    filters.forEach((filter) => {
      if (indexOf(filterKeys, filter.meta.key) !== -1) {
        found = true;
        const value = isArray(filter.meta.params) ? filter.meta.params : filter.meta.value();
        this.setState({ [queryKey]: value });
      }
    });

    // If filter not found or if it was previously removed
    if (!found) {
      this.setState({ [queryKey]: '' });
    }
  };

  updateFlowFilters = (filters) => {
    const flowFilter = find(
      filters,
      (filter) =>
        filter.meta.key === 'flow.keyword' || filter.meta.key === 'flow'
    );

    if (!flowFilter) {
      return;
    }

    const keyword = flowFilter.meta.value;

    const biDirectionalParts = keyword.split('<>');
    if (biDirectionalParts.length > 1) {
      return; // bi-directional flow is not supported
    }

    const parts = keyword.split('>');
    if (parts.length !== 2) {
      return;
    }

    const { srcIps, sPorts, destIps, dPorts } = this.state;

    const src = this.parseFlow(parts[0]);
    if (src.ip) {
      this.setState({ sIp: src.ip });
    }
    if (src.ports) {
      this.setState({ sPorts: src.ports });
    }

    const dest = this.parseFlow(parts[1]);
    if (dest.ip) {
      this.setState({ dIp: dest.ip });
    }
    if (dest.ports) {
      this.setState({ dPorts: dest.ports });
    }

    this.setState({ biDir: false });
  };

  parseFlow(flow) {
    const parts = flow.split(':');
    const ip = parts.length > 0 ? getValidIp(parts[0]) : null;
    const ports = parts.length == 2 ? head(uniq(parts[1].split(','))) : null;

    return { ip, ports };
  }

  componentDidMount() {
    // run this when component loads
    this.updateAllFilters(this.queryFilter.getFilters());
    this.getPorts();
  }

  componentDidUpdate() {
    const timeFilter = this.props.data.query.timefilter.timefilter.getTime();
    if (!isEqual(this.state.timeFilter, timeFilter)) {
      this.setState({ timeFilter });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.state.progressTimeout);
    clearInterval(this.state.progressInterval);
    this.setState({
      progressTimeout: null,
      showProgressBar: false,
      progressValue: 0,
      progressInterval: null,
      asyncProgressValue: 0,
      asyncProgressStatus: null,
      asyncId: null
    });
    this.BMFController.abortQuery(); // promise that we won't handle
  }

  getPorts() {
    this.BMFController.getDocElastic('ports')
      .then((res) => {
        if (res.data.results.body && res.data.results.body.found) {
          let ports = {};

          forIn(invert(res.data.results.body._source), function (value, key) {
            ports[toLower(key)] = value;
          });

          this.setState({ ports: ports });
        }
      })
      .catch((err) => {
        console.error('Unable to fetch ports', err);
      });
  }

  nextPage = () => {
    this.setState({ page: this.state.page + 1 });
  };

  // update the packet recorder window size
  updateWindow = (window) => {
    if (window && window.begin && window.end) {
      this.setState({ window: window });
    }
  };

  // the arrays passed from search form are in the format
  // [{label: 'ipaddr'}, ...]. this function flattens it to just an arr
  flattenArray(arr) {
    if (!arr) return arr;

    const temp = [];
    arr.forEach((ip) => {
      temp.push(ip.label);
    });
    return temp;
  }

  mapPorts(ports) {
    if (!ports) return ports;

    return map(ports, (port) =>
      isNaN(port) ? this.state.ports[toLower(port)] : port
    );
  }

  getPcapFilters(filters) {
    // the exact filters that need to be passed to utility
    // functions in order to create the correct
    // stenographer query
    const maxSize = filters.maxSize;
    const packetCount = filters.maxPackets;

    let protocol = filters.protocol;
    if (filters.selectedSearchType === 'flowanalysis') {
      switch (filters.selectedFlowAnalysisType) {
        case 'analysis-conv-udp':
          protocol = 17; // UDP
          break;
        case 'analysis-conv-tcp':
        case 'analysis-tcp-flow-health':
          protocol = 6; // TCP
          break;
      }
    }

    const pcapFilters = {
      size: maxSize * 1024 * 1024,
      packetCount: parseInt(packetCount),
      packetRecorders: this.flattenArray(filters.packetRecorders),
      start: 'after ' + filters.start, // added the before and after
      end: 'before ' + filters.end,
      srcIps: this.flattenArray(filters.srcIps),
      srcPorts: this.mapPorts(this.flattenArray(filters.srcPorts)),
      dstIps: this.flattenArray(filters.destIps),
      dstPorts: this.mapPorts(this.flattenArray(filters.destPorts)),
      proto: protocol,
      bidirection: filters.bidirectional,
      mode: 'absolute',
      deliveryInterface: filters.deliveryInterface,
      flowAnalysis: filters.selectedFlowAnalysisType,
      community_id: filters.communityId,
      mwDeviceId: filters.mwDeviceId,
      mwPortId: filters.mwPortId,
      btFilterInterfaces: this.flattenArray(filters.btFilterInterfaces),
      srcMacAddrs: this.flattenArray(filters.srcMacs),
      dstMacAddrs: this.flattenArray(filters.destMacs),
      btPolicyNames: this.flattenArray(filters.btPolicyNames),
      vlanTags: this.flattenArray(filters.vlanTags),
      vlanInnerTags: this.flattenArray(filters.vlanInnerTags),
      vlanMiddleTags: this.flattenArray(filters.vlanMiddleTags),
      vlanOuterTags: this.flattenArray(filters.vlanOuterTags),
      interval: filters.interval
    };

    return pcapFilters;
  }

  updateControllerList = (controllers) => {
    // update controller list and select the first one in the list
    this.setState({ controllers });

    // if there isn't a selection already, or if the selection
    // just got deleted, select another controller
    if (
      !this.state.selectedController ||
      controllers.indexOf(this.state.selectedController) === -1
    ) {
      let controller = controllers[0];

      this.setState(
        { selectedController: controller },
        this.BMFController.updateControllerURL(controller)
      );
    }
  };

  onChangeController = (e) => {
    this.setState(
      { selectedController: e.target.value },
      // update the url in the API itself too
      this.BMFController.updateControllerURL(e.target.value)
    );
  };

  onReturnToSearchPage = () => {
    this.setState({ page: 1 });
  };

  onReturnToLoginPage = () => {
    this.onAbort();
    this.setState({
      page: 0,
      showProgressBar: false,
      autoLogin: false // to avoid auto logging in on login page
    });
  };

  onReturnToResultPage = () => {
    // update search type to what it was before, then go to next page
    this.setState({
      selectedSearchType: this.state.previousFilters.selectedSearchType,
      page: 2
    });
  };

  onAbort = () => {
    this.BMFController.abortQuery()
      .then((res) => {
        // clear query params
        this.BMFController.setCurrentQuery(null);
        // now we hide progress bar and clear timeout
        clearTimeout(this.state.progressTimeout);
        clearInterval(this.state.progressInterval);
        this.setState({
          progressTimeout: null,
          showProgressBar: false,
          progressValue: 0,
          progressInterval: null,
          asyncProgressValue: 0,
          asyncProgressStatus: null,
          asyncId: null
        });
      })
      .catch((err) => {
        // console.log(err);
      });
  };

  checkAuthenticationError = (err) => {
    if (err.response && err.response.status === 401) {
      const errToast = {
        id: 'cookie-expired',
        title: 'Expired Login',
        color: 'warning',
        iconType: 'alert',
        text: <p>Please login again</p>
      };

      // display the toast
      this.displayToastsGeneral([errToast]);

      this.setState({
        showProgressBar: false
      });

      this.onReturnToLoginPage();

      return true;
    }
  };

  // Allows a different component outside of SearchPage to call
  // the submit. Does some logic to ensure flow is maintained
  // Kind of a hacky solution for now, might refactor if time
  onSubmitSearchExternal = (filters, searchFunction) => {
    // first, change page back to SearchPage
    // This is important because if we don't change page first, MainContainer
    // will render the result page (before we got the data)
    this.setState(
      { page: 1 },
      // second, run the search using the given filters
      this.onSubmitSearch(filters, searchFunction)
    );
  };

  fetchProgress = (searchFunction, pcapFilters, query) => {
    const {
      asyncId,
      asyncProgressValue,
      asyncProgressStatus,
      progressInterval
    } = this.state;

    if (asyncId && asyncProgressStatus !== 'complete') {
      Promise.all([
        this.BMFController.getAsyncRequestId(asyncId),
        this.BMFController.getAsyncRequestIdProgress(asyncId)
      ])
        .then((res) => {
          const asyncRequest = res[0];
          const asyncRequestProgress = res[1];

          const { status } = head(asyncRequest.data) || {};
          const { 'percent-complete': percent_ } =
            head(asyncRequestProgress.data) || {};

          this.setState({
            asyncProgressValue: percent_ || asyncProgressValue,
            progressValue: percent_ || asyncProgressValue,
            asyncProgressStatus: status
          });
        })
        .catch((err) => {
          if (progressInterval) {
            clearInterval(progressInterval);
            this.setState({ showProgressBar: false });
          }

          console.error(err.response);
          if (!this.checkAuthenticationError(err)) {
            this.displayToastsGeneral([
              {
                id: 'async-request-progress-error',
                title: 'Query Progress Error',
                color: 'danger',
                iconType: 'alert',
                text: <p>Error occurred while fetching the query progress</p>
              }
            ]);
          }
        });
    } else if (asyncId && asyncProgressStatus === 'complete') {
      if (progressInterval) {
        clearInterval(progressInterval);
        this.BMFController.getAsyncResponse(
          searchFunction,
          pcapFilters,
          query,
          asyncId
        )
          .then((res) => {
            // The controller returns a 200 code on error (when recorder is busy, etc)
            //  thus we need to do an additional check here to see if an error was returned.
            //   if yes, retry the request
            if (res.data && res.data.error && res.data.error.length > 0) {
              console.error(res.data.error);
              this.displayToastsError(res.data.error);
            }

            // stop progress bar from updating
            if (this.state.progressTimeout) {
              clearTimeout(this.state.progressTimeout);
            }

            if( res.data && res.data.error && res.data.error.length > 0) {
              this.setState(
                {
                  showProgressBar: false,
                  progressValue: 0,
                  progressTimeout: null,
                  asyncProgressValue: 0,
                  asyncProgressStatus: null,
                  asyncId: null
                }
              )
              res.data.error.forEach((x,i) => console.error(x));
            } else {
            this.setState(
              {
                showProgressBar: false,
                progressValue: 0,
                progressTimeout: null,
                data: res.data,
                asyncProgressValue: 0,
                asyncProgressStatus: null,
                asyncId: null
              },
              // this is the callback to run after setting above state
              //  it guarantees that data is set before changing to result page
              this.nextPage
            );
            }

            // Clear query from controller class once completed
            this.BMFController.setCurrentQuery(null);
          })
          .catch((err) => {
            this.setState({
              showProgressBar: false,
              progressValue: 0,
              progressTimeout: null,
              asyncProgressStatus: null,
              asyncProgressValue: 0,
              asyncId: null
            });

            console.error(err.response);
            if (!this.checkAuthenticationError(err)) {
              this.displayToastsGeneral([
                {
                  id: 'async-request-result-error',
                  title: 'Query Result Error',
                  color: 'danger',
                  iconType: 'alert',
                  text: <p>Error occurred while fetching the query result</p>
                }
              ]);
            }
          });
      }
    } else {
      if (progressInterval) {
        clearInterval(progressInterval);
        //todo: handle error
      }
    }
  };

  onSubmitSearch = (filters, searchFunction) => {
    this.setState({
      previousFilters: filters,
      selectedSearchType: filters.selectedSearchType, // to correctly render result
      selectedFlowAnalysisType: filters.selectedFlowAnalysisType,
      progressValue: 0,
      showProgressBar: true
    });

    const pcapFilters = this.getPcapFilters(filters);
    const query = this.BMFController.getQueryFromFilters(pcapFilters);

    this.BMFController.createAsyncRequestId()
      .then((response) => {
        if (response.data.id) {
          this.setState({ asyncId: response.data.id });

          this.BMFController.abortThenQuery(
            searchFunction,
            pcapFilters,
            query,
            response.data.id
          )
            .then((res) => {
              const interval = setInterval(
                () => this.fetchProgress(searchFunction, pcapFilters, query),
                2500
              );
              this.setState({ progressInterval: interval });
            })
            .catch((err) => {
              console.error(err.response);
              if (!this.checkAuthenticationError(err)) {
                this.displayToastsGeneral([
                  {
                    id: 'query-error',
                    title: 'Query Error',
                    color: 'danger',
                    iconType: 'alert',
                    text: <p>Error occurred while submitting the query</p>
                  }
                ]);
              }
            });
        }
      })
      .catch((err) => {
        console.error(err.response);
        if (!this.checkAuthenticationError(err)) {
          this.displayToastsGeneral([
            {
              id: 'async-request-error',
              title: 'Query Submit Error',
              color: 'danger',
              iconType: 'alert',
              text: <p>Error while submitting query using async request</p>
            }
          ]);
        }
      });
  };

  // Display error toasts for error responses from controller
  displayToastsError = (errors) => {
    const toasts = [];
    errors.forEach((error) => {
      const htmlId = htmlIdGenerator();

      toasts.push({
        id: htmlId(error['packet-recorder-name']),
        title: error.type,
        color: 'danger',
        iconType: 'alert',
        text: (
          <Fragment>
            <p>{error['packet-recorder-name']}</p>
            <p>{error.error}</p>
          </Fragment>
        )
      });
    });

    // add errors to global toast list
    this.setState((prevState) => ({
      toasts: prevState.toasts.concat(toasts)
    }));
  };

  // This function assumes the toasts are in the correct format already
  // Just a wrapper to pass to children of MainContainer to display messages
  // Either for success or failure
  displayToastsGeneral = (toasts) => {
    this.setState((prevState) => ({
      toasts: prevState.toasts.concat(toasts)
    }));
  };

  removeToast = (removedToast) => {
    this.setState((prevState) => ({
      toasts: prevState.toasts.filter((toast) => toast.id !== removedToast.id)
    }));
  };

  // the search page uses this function to update
  // MainContainer's stenographer query
  getQueryPreview = (filters) => {
    const pcapFilters = this.getPcapFilters(filters);
    return this.BMFController.getQueryFromFilters(pcapFilters);
  };

  renderResultPage = () => {
    switch (this.state.selectedSearchType) {
      case 'size':
        return <SizePage data={this.state.data} />;
      case 'appid':
        return (
          <AppIDPage
            data={this.state.data}
            onSubmitSearchExternal={this.onSubmitSearchExternal}
            filters={this.state.previousFilters}
            getFlowAnalysis={this.BMFController.getFlowAnalysis}
          />
        );
      case 'packets':
      case 'packet-objects':
        return (
          <Fragment>
            <EuiTitle>
              <h2>File Download</h2>
            </EuiTitle>
            <EuiLink
              href={
                'https://' +
                this.state.selectedController +
                this.state.data['coalesced-url']
              }
              target="_blank"
            >
              {this.state.data['coalesced-url']}
            </EuiLink>
          </Fragment>
        );
      case 'flowanalysis':
        const selected = this.state.selectedFlowAnalysisType;
        if (selected === 'analysis-tcp-flow-health') {
          return (
            <FlowAnalysisPage
              data={this.state.data}
              displayToasts={this.displayToastsGeneral}
              controller={this.BMFController}
            />
          );
        } else if (selected === 'analysis-hosts') {
          return <HostsTable data={this.state.data} />;
        } else if (
          selected === 'analysis-conv-ipv4' ||
          selected === 'analysis-conv-ipv6' ||
          selected === 'analysis-conv-tcp' ||
          selected === 'analysis-conv-udp'
        ) {
          return <IPTable data={this.state.data} />;
        } else if (selected === 'analysis-http-tree') {
          return <HttpTable data={this.state.data} />;
        } else if (selected === 'analysis-http-req-tree') {
          return <HttpReqTable data={this.state.data} />;
        } else if (selected === 'analysis-dns-tree') {
          return <DnsTable data={this.state.data} />;
        } else if (selected === 'analysis-rtp-streams') {
          return <RtpStreamTable data={this.state.data} />;
        } else if (selected == 'analysis-conv-sip') {
          return <SipTable data={this.state.data} />;
        } else if (selected == 'analysis-sip-stat') {
          return <SipStatTable data={this.state.data} />;
        }

        // else return
        return <div>Not supported yet</div>;

/*       case 'trends':
        return (
          <EmbeddedPage
            timeRange={{
              from: this.state.previousFilters.start,
              to: this.state.previousFilters.end
            }}
          />
        ); */
    }
  };

  renderCorrectPage = () => {
    const { page, window } = this.state;

    switch (page) {
      case 0:
        return (
          <Fragment>
            <ControllerConfig
              controllers={this.state.controllers}
              selectedController={this.state.selectedController}
              updateControllerList={this.updateControllerList}
              onChangeController={this.onChangeController}
              BMFController={this.BMFController}
            />

            <EuiSpacer size="l" />

            {this.state.selectedController && (
              <ControllerLogin
                autoLogin={this.state.autoLogin}
                selectedController={this.state.selectedController}
                nextPage={this.nextPage}
                updateWindow={this.updateWindow}
                BMFController={this.BMFController}
                displayToasts={this.displayToastsGeneral}
              />
            )}
          </Fragment>
        );
      case 1:
        const oldest = window.begin ? moment(window.begin).format(DATETIME_FORMAT) : '-';
        const latest = window.end ? moment(window.end).format(DATETIME_FORMAT) : '-';
        return (
          <div className="form-container mx-auto">
            <EuiFlexGroup gutterSize="none" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={this.onReturnToLoginPage}
                  iconType="editorUndo"
                >
                  Back to Login
                </EuiButtonEmpty>
              </EuiFlexItem>

              <EuiFlexItem grow={false} style={{ minWidth: 360 }}>
                <EuiDescriptionList compressed type="column" align="center">
                  <EuiDescriptionListTitle className="eui-description-custom">Oldest Packet <EuiIcon type="clock" /></EuiDescriptionListTitle>
                  <EuiDescriptionListDescription className="eui-description-custom">{oldest}</EuiDescriptionListDescription>
                  <EuiDescriptionListTitle className="eui-description-custom">Latest Packet <EuiIcon type="clock" /></EuiDescriptionListTitle>
                  <EuiDescriptionListDescription className="eui-description-custom">{latest}</EuiDescriptionListDescription>
                </EuiDescriptionList>
              </EuiFlexItem>

              <EuiFlexItem grow={false} style={{ minWidth: 180 }}>
                {this.state.data !== null && (
                  <EuiButtonEmpty
                    onClick={this.onReturnToResultPage}
                    iconType="editorRedo"
                    iconSide="right"
                  >
                    Back to Results
                  </EuiButtonEmpty>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <SearchPage
              sIp={this.state.sIp} // set default from filters
              dIp={this.state.dIp} // set default from filters
              sMac={this.state.sMac}
              dMac={this.state.dMac}
              sPorts={this.state.sPorts} // set default from filters
              dPorts={this.state.dPorts} // set default from filters
              community_id={this.state.community_id} // set default from filters
              BTifName={this.state.BTifName} // set default from filters
              biDir={this.state.biDir} // set default from filters
              protocol={this.state.protocol} // set default from filters
              previousFilters={this.state.previousFilters}
              BMFController={this.BMFController}
              selectedController={this.state.selectedController}
              onSubmitSearch={this.onSubmitSearch}
              getQueryPreview={this.getQueryPreview}
              getSummary={this.BMFController.getSummary}
              getAppID={this.BMFController.getAppID}
              getPackets={this.BMFController.getPackets}
              getPacketObjects={this.BMFController.getPacketObjects}
              getReplay={this.BMFController.getReplay}
              getFlowAnalysis={this.BMFController.getFlowAnalysis}
              getIntervalAnalysis={this.BMFController.getIntervalAnalysis}
              onAbort={this.onAbort}
              displayToasts={this.displayToastsGeneral}
              ports={this.state.ports}
              data={this.data}
              timeFilter={this.state.timeFilter}
            />
          </div>
        );
      case 2:
        return (
          <Fragment>
            <EuiButtonEmpty
              onClick={this.onReturnToSearchPage}
              iconType="editorUndo"
            >
              Back to search
            </EuiButtonEmpty>

            <EuiSpacer size="m" />

            {this.renderResultPage()}
          </Fragment>
        );
    }
    return;
  };

  renderProgressBar = () => {
    if (this.state.showProgressBar) {
      return (
        <>
          <EuiFlexGroup alignItems="center" className="maxWidth mx-auto">
            <EuiFlexItem grow={false}>
              <EuiText>
                <p>{this.state.progressValue}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiProgress
                value={this.state.progressValue}
                max={100}
                size="s"
                color="secondary"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup
            alignItems="center"
            className="maxWidth mx-auto"
            gutterSize="none"
          >
            <EuiFlexItem>
              {this.state.progressValue === 100 && (
                <EuiText textAlign="center">
                  <p>Coalescing...</p>
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      );
    }
  };

  renderToasts() {
    return (
      <EuiGlobalToastList
        toasts={this.state.toasts}
        dismissToast={this.removeToast}
        toastLifeTimeMs={8000}
      />
    );
  }

  render() {
    return (
      <div className="main-container" id="main-container">
        {this.renderCorrectPage()}
        {this.renderProgressBar()}
        {this.renderToasts()}
      </div>
    );
  }
}

export default MainContainer;
