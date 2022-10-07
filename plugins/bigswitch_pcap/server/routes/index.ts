import { IRouter, RequestHandlerContext, KibanaResponseFactory } from '../../../../src/core/server';
import https from 'https';
import { schema } from '@kbn/config-schema';
const axios = require('axios');

// @ts-ignore
import { getScopingByAttribute } from './utils.js';

import {
  getCompiledExpression,
  evaluateExpr,
  addFlowString
  // @ts-ignore
} from '../../common/utils/HealthScore.js';

async function customHandler(req: any, h: KibanaResponseFactory, axiosObject: any) {
  // PREPEND CONTROLLER URL TO THE AXIOS OBJECT !
  // ex. turns /api/v1/auth/login to : https://10.100.6.15:8443/api/v1/auth/login
  // Port 8443
  let url = 'https://' + req.query.controllerURL + ':8443' + axiosObject.url;
  console.log(`BIGSWITCH PCAP URL: ${url}`);
  if (!req.query.isResult && req.query.asyncId) {
    url = url + '?initiate-async-id=' + req.query.asyncId;
  } else if (req.query.isResult && req.query.asyncId) {
    url = url + '?async-id=' + req.query.asyncId;
  }

  axiosObject.url = url;

  // how to respond to client
  // if no error, return with 200
  let statusCode = 200;

  let res;
  let message;
  try {
    res = await axios(axiosObject);
    console.log(`BIGSWITCH PCAP Request successful ${res.data}`);
    res = res.data;
    message = '';

  } catch( err ) {
    message = err.message;
    if (err.response) {
      console.log(`BIGSWITCH PCAP Request response error ${err.response}`);
      statusCode = err.response.status;
      res = err.response.data;
    } else if (err.request) {
      // The request was made but no response was received
      // `err.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(`BIGSWITCH PCAP Request error no response ${err.request}`);
      statusCode = 500;
      res = err.request;
    } else {
      console.log(`BIGSWITCH PCAP Request error ${err.message}`);
      // Something happened in setting up the request that triggered an err
      statusCode = 500;
      res = err.message;
    }
  }

  console.log(`BIGSWITCH PCAP Axios op complete statusCode: ${statusCode}`);
  // code is used to correctly pass on the success value to client
  let response;
  if( statusCode == 200 ) {
    response = h.ok(
      { body : res }
    );
  } else {
    console.log(`BIGSWITCH PCAP Before error object error message ${message}`);
    const error_obj =       {
      statusCode: statusCode,
      body: {
        message: message,
        attributes: res
      }
    };
    console.log(`BIGSWITCH PCAP After error object`);
    response = h.customError(
      error_obj
    );
    console.log(`BIGSWITCH PCAP After custom error`);
  }
  return response;
}

async function getScoringExpression(context: RequestHandlerContext, type: string) {
  try {
    const result = await context.core.elasticsearch.client.asCurrentUser.get({
      index: '.config',
      type: '_doc',
      id: type
    });
    return result;
  } catch (err) {
    return null;
  }
}

function applyScoring(flows: any[], expr: any, type: string) {
  const compiledExpr = getCompiledExpression(expr);

  flows.forEach((flow) => {
    flow['stats-a-to-b'][type] = evaluateExpr(
      compiledExpr,
      flow['stats-a-to-b']
    );
    flow['stats-b-to-a'][type] = evaluateExpr(
      compiledExpr,
      flow['stats-b-to-a']
    );
  });
}

// Takes the flows and puts them in the format needed to post to ES
// This includes adding flowstring and applying the default health scores(network and endpoint)
async function formatFlowsBeforeBulkPost(context: RequestHandlerContext, flows: any[]) {
  const networkScoring = await getScoringExpression(context, 'exprNetwork');
  const endpointScoring = await getScoringExpression(context, 'exprEndpoint');
  if (networkScoring != null) {
    applyScoring(
      flows,
      networkScoring.body._source.default[0].data,
      'network-score'
    );
  }

  if (endpointScoring != null) {
    applyScoring(
      flows,
      endpointScoring.body._source.default[0].data,
      'endpoint-score'
    );
  }

  addFlowString(flows);
}

async function bulkPostFlows(context: RequestHandlerContext, flows: any, req: any) {
  if (!flows) return; // if no flows returned from pcap query

  // FORMAT flows before sending
  await formatFlowsBeforeBulkPost(req, flows);

  const body = [];
  // this format is needed for the bulk API, check kibana docs
  for (let i = 0; i < flows.length; i++) {
    body.push({ index: {} });
    body.push(flows[i]);
  }

  const settings = {
    index: 'temp_data_pcap',
    type: 'flow',
    body
  };

  try {
    return await context.core.elasticsearch.client.asCurrentUser.bulk(settings);
  } catch (err) {
    return err;
  }
}

export function defineRoutes(router: IRouter) {
  // At request level
  const agent = new https.Agent({
    rejectUnauthorized: false
  });

  router.post(
    {
      path: '/controller/login',
      validate: {
        body: schema.object({
          username: schema.string(),
          password: schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url: '/api/v1/auth/login',
        httpsAgent: agent,
        data: {
          user: req.body.username,
          password: req.body.password
        }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/packet-recorder',
      validate: {
        body: schema.object({
          session_cookie: schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'GET',
        url:
          '/api/v1/data/controller/core/switch-config[role="packet-recorder"]',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/policy',
      validate: {
        body: schema.object({
          session_cookie: schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'GET',
        url:
          '/api/v1/data/controller/applications/dmf/policy',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/filter-interface',
      validate: {
        body: schema.object({
          session_cookie: schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'GET',
        url:
          '/api/v1/data/controller/applications/dmf/topology/filter-interface?select=dmf-interface',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/create-async-request-id',
      validate: {
        body: schema.object({
          session_cookie: schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url: '/api/v1/rpc/controller/core/db/async-request/create-id',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/async-request-id',
      validate: {
        body: schema.object({
          session_cookie: schema.string(),
          id: schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'GET',
        url:
          '/api/v1/data/controller/core/db/async-request' +
          getScopingByAttribute('id', req.body.id),
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/async-request-id-progress',
      validate: {
        body: schema.object({
          session_cookie: schema.string(),
          id: schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'GET',
        url:
          '/api/v1/data/controller/core/db/async-request' +
          getScopingByAttribute('id', req.body.id) +
          '/progress-report',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/window',
      validate: {
        body: schema.object({
          session_cookie: schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url:
          '/api/v1/rpc/controller/applications/dmf/packet-recorder/action/query/window',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  const controller_body = {
    coalesce : schema.boolean(),
    session_cookie: schema.string(),
    'stenographer-query': schema.string(),
    'limit-packets': schema.number(),
    'limit-bytes': schema.number(),
    'packet-recorder': schema.maybe(schema.arrayOf(schema.object({ name: schema.string() }))),
    'delivery-interface': schema.maybe(schema.arrayOf(schema.object({ name: schema.string() }))),
  };
  router.post(
    {
      path: '/controller/summary',
      validate: {
        body: schema.object(controller_body),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url:
          '/api/v1/rpc/controller/applications/dmf/packet-recorder/action/query/size',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
        data: {
          'stenographer-query': req.body['stenographer-query'],
          coalesce: req.body.coalesce,
          'limit-packets': req.body['limit-packets'],
          'limit-bytes': req.body['limit-bytes'],
          'packet-recorder': req.body['packet-recorder']
        }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/status',
      validate: {
        body: schema.object({
          session_cookie: schema.string(),
          'stenographer-query': schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'GET',
        url:
          '/api/v1/data/controller/applications/dmf/packet-recorder/state/active-queries/controller-query',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
        data: {
          'stenographer-query': req.body['stenographer-query'],
        }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/interfaces',
      validate: {
        body: schema.object({
          session_cookie: schema.string()
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'GET',
        url:
          '/api/v1/data/controller/applications/dmf/topology/delivery-interface',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/detail',
      validate: {
        body: schema.object(controller_body),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url:
          '/api/v1/rpc/controller/applications/dmf/packet-recorder/action/query/application',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
        data: {
          'stenographer-query': req.body['stenographer-query'],
          coalesce: req.body.coalesce,
          'limit-packets': req.body['limit-packets'],
          'limit-bytes': req.body['limit-bytes'],
          'packet-recorder': req.body['packet-recorder']
        }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/packet',
      validate: {
        body: schema.object(controller_body),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url:
          '/api/v1/rpc/controller/applications/dmf/packet-recorder/action/query/packet-data',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
        data: {
          'stenographer-query': req.body['stenographer-query'],
          coalesce: req.body.coalesce,
          'limit-packets': req.body['limit-packets'],
          'limit-bytes': req.body['limit-bytes'],
          'packet-recorder': req.body['packet-recorder']
        }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/packet-objects',
      validate: {
        body: schema.object(controller_body),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url: '/api/v1/rpc/controller/applications/dmf/packet-recorder/action/query/packet-object',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
        data: {
          'stenographer-query': req.body['stenographer-query'],
          coalesce: req.body.coalesce,
          'limit-packets': req.body['limit-packets'],
          'limit-bytes': req.body['limit-bytes'],
          'packet-recorder': req.body['packet-recorder']
        }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/replay',
      validate: {
        body: schema.object(controller_body),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url:
          '/api/v1/rpc/controller/applications/dmf/packet-recorder/action/query/replay',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
        data: {
          'stenographer-query': req.body['stenographer-query'],
          coalesce: req.body.coalesce,
          'limit-packets': req.body['limit-packets'],
          'limit-bytes': req.body['limit-bytes'],
          'packet-recorder': req.body['packet-recorder'],
          'delivery-interface': req.body['delivery-interface'],
        },
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/flow-analysis',
      validate: {
        body: schema.object({
          ...controller_body,
          flowAnalysis: schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url:
          '/api/v1/rpc/controller/applications/dmf/packet-recorder/action/query/' +
          req.body.flowAnalysis,
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
        data: {
          'stenographer-query': req.body['stenographer-query'],
          'limit-packets': req.body['limit-packets'],
          'limit-bytes': req.body['limit-bytes'],
          coalesce: req.body.coalesce,
          'packet-recorder': req.body['packet-recorder']
        }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  router.post(
    {
      path: '/controller/interval-analysis',
      validate: {
        body: schema.object({
          ...controller_body,
          flowAnalysis: schema.string(),
          interval: schema.number(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url:
          '/api/v1/rpc/controller/applications/dmf/packet-recorder/action/query/' +
          req.body.flowAnalysis,
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
        data: {
          'stenographer-query': req.body['stenographer-query'],
          'limit-packets': req.body['limit-packets'],
          'limit-bytes': req.body['limit-bytes'],
          interval: req.body.interval.toString(),
          coalesce: req.body.coalesce,
          'packet-recorder': req.body['packet-recorder']
        }
      };
      const result = await customHandler(req, response, axiosObject);
      return await bulkPostFlows(context, result, req);
    }
  );

  router.post(
    {
      path: '/controller/abort',
      validate: {
        body: schema.object({
          session_cookie: schema.string(),
          'stenographer-query': schema.string(),
        }),
        query: schema.object({
          controllerURL: schema.string(),
          isResult: schema.maybe(schema.boolean()),
          asyncId: schema.maybe(schema.string()),
        })
      }
    },
    async (context, req, response) => {
      const axiosObject = {
        method: 'POST',
        url: '/api/v1/rpc/controller/applications/dmf/packet-recorder/action/abort',
        httpsAgent: agent,
        headers: { Cookie: 'session_cookie=' + req.body.session_cookie },
        data: {
          'stenographer-query': req.body['stenographer-query'],
        }
      };
      return await customHandler(req, response, axiosObject);
    }
  );

  // Elastic search endpoints
  // Get documents
  router.get(
    {
      path: '/es/get_doc/{name}',
      validate: {
        params: schema.object(
          { name: schema.string({ minLength: 2 }) }
        ),
        query: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, req, res) => {
      const index = req.params.name;
      const id = req.query.id;
      try {
        const results = await context.core.elasticsearch.client.asCurrentUser.get(
          { index: index, id: id, type:'_doc' })
        return res.ok({
          body: { results }
        });
      } catch (err) {
        const errObj = res.customError({
          statusCode: 500,
          body: {
            message: 'ElasticSearch error',
            attributes: err
          }
        });
        return errObj;
      }
    }
  );

  router.put(
    {
      path: '/es/put_doc/{name}',
      validate: {
        params: schema.object(
          { name: schema.string({ minLength: 2 }) }
        ),
        query: schema.object({
          id: schema.string(),
        }),
        body: schema.object(
          {}, { unknowns: 'allow' }
        )
      },
    },
    async (context, req, res) => {
      const index = req.params.name;
      const id = req.query?.id;
      try {
        const results = await context.core.elasticsearch.client.asCurrentUser.index(
          { index: index, id: id, body: req.body })
        return res.ok({
          body: { results }
        });
      } catch (err) {
        const errObj = res.customError({
          statusCode: 500,
          body: {
            message: 'ElasticSearch error',
            attributes: err
          }
        });
        return errObj;
      }
    }
  );

  router.put(
    {
      path: '/es/put_doc_bulk/{name}',
      validate: {
        params: schema.object(
          { name: schema.string({ minLength: 2 }) }
        ),
        query: schema.object({
          id: schema.string(),
        }),
        body: schema.object(
          { flows: schema.arrayOf(schema.any()) }, { unknowns: 'allow' }
        )
      },
    },
    async (context, req, res) => {
      //const results = { size: size_, body: body };
      const results = await bulkPostFlows(context, req.body.flows, req)
      return res.ok({
        body: { results }
      });
    }
  );
}
