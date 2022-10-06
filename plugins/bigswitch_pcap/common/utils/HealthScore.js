/*
Used for the logic in determining network health, host health
and computing a score metric to display
*/
import { camelCase } from 'lodash';
const math = require('mathjs');

// Takes a list of flows, and for each of those flows creates a flow string
// based on the source ip, dest IP, and the APP port (which is the lower port)
export function addFlowString(flows) {
  if (!flows) return [];

  flows.forEach((flow) => {
    // get lower port and compute the flowString
    let flowString = '';

    // Examples: 10.100.6.15:8443>10.111.38.208 or 10.111.38.208:8443>10.100.6.15
    if (flow['host-a-port'] > flow['host-b-port']) {
      flowString =
        flow['host-a-ip'] + '>' + flow['host-b-ip'] + ':' + flow['host-b-port'];
    } else {
      flowString =
        flow['host-a-ip'] + ':' + flow['host-a-port'] + '>' + flow['host-b-ip'];
    }

    // Now add the flowstring to the flow
    flow.flowString = flowString;
  });

  return flows;
}

// Return a mathjs parsed and compiled object based on the expression given
// This allows a custom scope to be applied for each flow in order to calculate
// Health Score for whatever metric defined in expr.
export function getCompiledExpression(expr) {
  const node = math.parse(expr);
  const code = node.compile();

  // can now do code.evaluate(scope) in caller
  return code;
}

export function isExpressionValid(expr, stats) {
  const scope = getScope(stats);

  try {
    expr.evaluate(scope);
    return true;
  } catch (err) {
    // Usually occurs when a variable in expr is undefined in scope
    return false;
  }
}

export function getScope(stats) {
  const scope = {};

  // transforms stats like retransmitted-packets to retransmittedPackets
  // using lodash.camelCase
  for (const [key, value] of Object.entries(stats)) {
    scope[camelCase(key)] = value;
  }

  return scope;
}

// Evaluate the given expression by extracting the scope from the stats provided
export function evaluateExpr(expr, stats) {
  const scope = getScope(stats);

  let result;

  try {
    result = expr.evaluate(scope);
  } catch (err) {
    // Usually occurs when a variable in expr is undefined in scope
    //console.log(err);
  }

  // If the evaluation failed, usually because expr is empty, return NaN.
  if (typeof result === 'undefined' || result === null) {
    return NaN;
  }

  // If empty expression, return 0. An empty expression can occur when user
  // adds a semicolon after every line (semicolon does not output the result to the left of it)
  // eg: 'x=3' will return 3 while 'x=3;' will return an empty ResultSet
  if (result.entries && result.entries.length === 0) {
    return 0; // return 0
  }

  // If the expression uses semi colons, the result is a ResultSet as opposed to
  // a number. Thus, if the result is an array, return the last entry. There can be
  // multiple entries if the expression is multi line, we do NOT consider/want those cases.
  // Since the return value is one score, we don't want to return more than one thing, for now
  // But if the user makes a mistake, use the last computed value (last line of the expr)
  if (typeof result.entries !== 'undefined') {
    return result.entries[result.entries.length - 1];
  }

  // If result is a number
  return result;
}

// Returns the equivalent Tex based on the expr
export function getLatexFromExpr(expr) {
  // use try catch block in order to avoid throwing an error
  // while the user is typing. If there is an error, just invalidate submitting
  // the expression, but continue to let the user type until it is valid.
  try {
    const node = math.parse(expr);
    return node.toTex();
  } catch (err) {
    return null;
  }
}
