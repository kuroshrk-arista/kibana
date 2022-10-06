// File for interacting with the DMF controller
import { isEmpty, map } from 'lodash';
import { formPacketRecorderData } from './PacketRecorderQuery';
const axios = require('axios');
const CancelToken = axios.CancelToken;

const KIBANA_VERSION = '7.13.0-SNAPSHOT';

function getCookie() {
  return localStorage.getItem('session_cookie');
}

export class BMFController {
  constructor(core, selectedController) {
    this.currentQuery = null;
    this.controllerURL = selectedController;
    this.source = CancelToken.source(); // create the first cancel token
    this.core = core
  }

  // To keep track of which URL to use when querying controller
  updateControllerURL = (controllerURL) => {
    this.controllerURL = controllerURL;
    localStorage.setItem('last_login_url', this.controllerURL);
  };

  getCookie() {
    return localStorage.getItem('session_cookie');
  }

  setCurrentQuery(query) {
    this.currentQuery = query;
  }

  // Abort the last known query. Usually called if there's an error
  //  thrown to prevent controller/recorder from getting stuck
  abortQuery = async () => {
    if (this.currentQuery) {
      // use axios cancel token to reject the earlier request promises
      this.source.cancel('query aborted');
      // create a new token, for subsequent calls
      this.source = CancelToken.source();

      // if the query exists, it means it is still in progress
      // abort it
      return axios({
        url: this.core.http.basePath.prepend('/controller/abort'),
        method: 'post',
        params: { controllerURL: this.controllerURL },
        headers: {
          'kbn-version': KIBANA_VERSION,
          'kbn-xsrf': true
        },
        data: {
          session_cookie: getCookie(),
          'stenographer-query': this.currentQuery
        }
      });
    } else {
      Promise.resolve('No query in progress');
    }
  };

  // this is a function that aborts any existing queries,
  // and then runs the supplied nextQuery
  abortThenQuery = async (nextQuery, filters, query, asyncId) => {
    const res = await this.abortQuery()
      .then((res) => {
        // set new query
        this.currentQuery = query;
        return nextQuery(filters, query, asyncId);
      })
      .catch((err) => {
        return Promise.reject(err);
      });

    return res;
  };

  login = (user, pass) => {
    localStorage.setItem('last_login_url', this.controllerURL);
    axios.interceptors.response.use(
      response => response,
      error => {
        throw error;
      }
    )
    return axios({
      url: this.core.http.basePath.prepend('/controller/login'),
      method: 'post',
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      params: { controllerURL: this.controllerURL },
      data: {
        username: user,
        password: pass
      }
    });
  };

  createAsyncRequestId = () => {
    const url = this.core.http.basePath.prepend('/controller/create-async-request-id');
    const session_cookie = getCookie();
    const axios_obj = {
      url: url,
      method: 'POST',
      params: { controllerURL: this.controllerURL },
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        session_cookie: session_cookie
      }
    };
    return axios(axios_obj);
  };

  getAsyncRequestId = (id) => {
    const url = this.core.http.basePath.prepend('/controller/async-request-id');
    const session_cookie = getCookie();
    const axios_obj = {
      url: url,
      method: 'POST',
      params: { controllerURL: this.controllerURL },
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        id,
        session_cookie: session_cookie
      }
    };
    return axios(axios_obj);
  };

  getAsyncRequestIdProgress = (id) => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/async-request-id-progress'),
      method: 'POST',
      params: { controllerURL: this.controllerURL },
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        id,
        session_cookie: getCookie()
      }
    });
  };

  getAsyncResponse = (searchFunction, pcapFilters, query, asyncId) => {
    return searchFunction(pcapFilters, query, asyncId, true);
  };

  getPacketRecorders = () => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/packet-recorder'),
      method: 'POST',
      params: { controllerURL: this.controllerURL },
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        session_cookie: getCookie()
      }
    });
  };

  getPolicies = () => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/policy'),
      method: 'POST',
      params: { controllerURL: this.controllerURL },
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        session_cookie: getCookie()
      }
    });
  };

  getFilterInterfaces = () => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/filter-interface'),
      method: 'POST',
      params: { controllerURL: this.controllerURL },
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        session_cookie: getCookie()
      }
    });
  };

  getQueryWindow = async () => {
    axios.interceptors.response.use(
      response => response,
      error => {
        throw error;
      }
    )
    const url = this.core.http.basePath.prepend('/controller/window');
    const session_cookie = getCookie();
    const req_obj = {
      url: url,
      method: 'post',
      params: { controllerURL: this.controllerURL },
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        session_cookie: session_cookie
      }
    };
    return axios(req_obj);
  };

  getPacketRecordersData = (packetRecorders) => {
    return map(packetRecorders, (pr) => ({ name: pr }));
  };

  getQueryData = (filters, query) => {
    var data = {
      session_cookie: getCookie(),
      'stenographer-query': query,
      coalesce: true,
      'limit-packets': filters.packetCount,
      'limit-bytes': filters.size
    };

    if (!isEmpty(filters.packetRecorders)) {
      data['packet-recorder'] = this.getPacketRecordersData(
        filters.packetRecorders
      );
    }

    if (!isEmpty(filters.deliveryInterface)) {
      data['delivery-interface'] = [{ name: filters.deliveryInterface }];
    }

    return data;
  };

  getQueryParams = (asyncId, isResult) => {
    return {
      controllerURL: this.controllerURL,
      asyncId,
      isResult
    };
  };

  getSummary = (filters, query, asyncId, isResult) => {
    const url = this.core.http.basePath.prepend('/controller/summary');
    const params = this.getQueryParams(asyncId, isResult);
    const data = this.getQueryData(filters, query);
    const axios_obj = {
      url: url,
      method: 'POST',
      params: params,
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: data,
      cancelToken: this.source.token
    };
    return axios(axios_obj);
  };

  getAppID = (filters, query, asyncId, isResult) => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/detail'),
      method: 'post',
      params: this.getQueryParams(asyncId, isResult),
      headers: {
        'kbn-version': KIBANA_VERSION
      },
      data: this.getQueryData(filters, query),
      cancelToken: this.source.token
    });
  };

  checkQueryStatus = (filters, query) => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/status'),
      method: 'post',
      params: { controllerURL: this.controllerURL },
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        session_cookie: getCookie(),
        'stenographer-query': query
      },
      cancelToken: this.source.token
    });
  };

  getPackets = (filters, query, asyncId, isResult) => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/packet'),
      method: 'post',
      params: this.getQueryParams(asyncId, isResult),
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: this.getQueryData(filters, query),
      cancelToken: this.source.token
    });
  };

  getPacketObjects = (filters, query, asyncId, isResult) => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/packet-objects'),
      method: 'post',
      params: this.getQueryParams(asyncId, isResult),
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true,
      },
      data: this.getQueryData(filters, query),
      cancelToken: this.source.token
    });
  };

  getReplay = (filters, query, asyncId, isResult) => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/replay'),
      method: 'post',
      params: this.getQueryParams(asyncId, isResult),
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: this.getQueryData(filters, query),
      cancelToken: this.source.token
    });
  };

  getFlowAnalysis = (filters, query, asyncId, isResult) => {
    var packetRecorders = [];
    if (!isEmpty(filters.packetRecorders)) {
      packetRecorders = this.getPacketRecordersData(filters.packetRecorders);
    }
    const url = this.core.http.basePath.prepend('/controller/flow-analysis');
    const data = {
      coalesce: true,
      session_cookie: getCookie(),
      'stenographer-query': query,
      'limit-packets': filters.packetCount,
      'limit-bytes': filters.size,
      flowAnalysis: filters.flowAnalysis,
      'packet-recorder': packetRecorders
    }
    const axios_obj = {
      url: url,
      method: 'POST',
      params: this.getQueryParams(asyncId, isResult),
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: data,
      cancelToken: this.source.token
    };
    return axios(axios_obj);
  };

  getIntervalAnalysis = (filters, query, asyncId, isResult) => {
    var packetRecorders = [];
    if (!isEmpty(filters.packetRecorders)) {
      packetRecorders = this.getPacketRecordersData(filters.packetRecorders);
    }
    return axios({
      url: this.core.http.basePath.prepend('/controller/interval-analysis'),
      method: 'post',
      params: this.getQueryParams(asyncId, isResult),
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        session_cookie: getCookie(),
        'stenographer-query': query,
        'limit-packets': filters.packetCount,
        'limit-bytes': filters.size,
        flowAnalysis: 'analysis-tcp-flow-health', // Interval analysis only works for tcp flow health for now
        interval: filters.interval,
        'packet-recorder': packetRecorders
      },
      cancelToken: this.source.token
    });
  };

  getDeliveryInterfaces = () => {
    return axios({
      url: this.core.http.basePath.prepend('/controller/interfaces'),
      method: 'post',
      params: { controllerURL: this.controllerURL },
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        session_cookie: getCookie()
      },
      cancelToken: this.source.token
    });
  };

  // Returns the stenographer for use in query preview
  getQueryFromFilters(filters) {
    return formPacketRecorderData(filters);
  }

  getDocElastic = (name) => {
    return axios({
      url: this.core.http.basePath.prepend('/es/get_doc/.config?id=' + name),
      method: 'GET',
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      }
    });
  };


  putDocElastic = async (name, doc) => {
    return axios({
      url: this.core.http.basePath.prepend('/es/put_doc/.config?id=' + name),
      method: 'put',
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: doc
    });

  };

  // Post each flow as a document in the elastic index to visualize in kibana
  // Cannot handle > 1MB. Keeping this for reference, but this is now taken care of by the
  // server directly in BMFControllerAPI.js
  postBulkFlows = (data) => {
    axios({
      url: this.core.http.basePath.prepend('/es/put_doc_bulk'),
      method: 'post',
      headers: {
        'kbn-version': KIBANA_VERSION,
        'kbn-xsrf': true
      },
      data: {
        flows: data.entry // the list of flows
      }
    })

      .then((res) => {
        if (res.data) {
          // if one or more shards have it, it's successful
          // if(res.data._shards.successful > 0) {
          //   console.log(res);
          // } else {
          //   console.log(res);
          //   console.log('Failed to add new controller');
          // }
        }
      })
      .catch((err) => {
        // todo: handle error
        if (err.response) {
          // console.log(err.response);
        } else {
          // console.log(err);
        }
      });
  };
}
