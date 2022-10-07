import React, { Fragment } from 'react';

import { ScoringPage } from '../ScoringPage';
import {
  getCompiledExpression,
  evaluateExpr,
  isExpressionValid
} from '../../../common/utils/HealthScore';

import {
  htmlIdGenerator,
  EuiInMemoryTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiFormRow,
  EuiSearchBar,
  EuiSwitch,
  EuiToolTip,
  EuiLink,
  EuiTitle,
  EuiModal,
  EuiText,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiBasicTable
} from '@elastic/eui';

export class FlowAnalysisPage extends React.Component {
  constructor(props) {
    super(props);
    // Defaults for expression parsing for scoring health
    // this.exprNetworkStringDefault = 'temp=((retransmittedDataPackets / totalPackets) / 0.03) * 100 * (1/3); temp > (1/3 * 100) ? (1/3 * 100) : temp';
    // this.exprEndpointStringDefault = 'x = 3';

    this.exprNetworkStringDefault = '0';
    this.exprEndpointStringDefault = '0';
    // As of writing this, some endpoints return a JSON object,
    // others return a string. Thus we parse this.props.data as JSON if needed
    this.state = {
      data:
        typeof this.props.data === 'string'
          ? JSON.parse(this.props.data)
          : this.props.data,
      selectedDetail: 'throughput-bytes-per-second',
      exprNetworkString: this.exprNetworkStringDefault,
      exprNetworkCompiled: getCompiledExpression(this.exprNetworkStringDefault),
      exprEndpointString: this.exprEndpointStringDefault,
      exprEndpointCompiled: getCompiledExpression(
        this.exprEndpointStringDefault
      ),
      showScoringPage: false,
      loading: false,
      query: EuiSearchBar.Query.MATCH_ALL,
      items: typeof this.props.data === 'string'
        ? JSON.parse(this.props.data).entry
        : this.props.data.entry,
      queryStringSyntax: false,
      showHelp: false
    };

    this.onChangeDetail = this.onChangeDetail.bind(this);

    this.detailOptions = [
      {
        value: 'throughput-bytes-per-second',
        inputDisplay: 'Throughput'
      },
      {
        value: 'out-of-order-packets',
        inputDisplay: 'Out of Order Packets'
      },
      {
        value: 'retransmitted-data-packets',
        inputDisplay: 'Retransmitted Packets'
      },
      {
        value: 'rtt-max-ms',
        inputDisplay: 'RTT Maximum (ms)'
      },
      {
        value: 'rtt-avg-ms',
        inputDisplay: 'RTT Average (ms)'
      },
      {
        value: 'rtt-stdev',
        inputDisplay: 'RTT Standard Deviation (ms)'
      },
      {
        value: 'window-advertised-zero',
        inputDisplay: 'Window Advertised Zero'
      },
      {
        value: 'window-zero-probe-packets',
        inputDisplay: 'Window Zero Probe Packets'
      },
      {
        value: 'network-score',
        inputDisplay: 'Network Health'
      },
      {
        value: 'endpoint-score',
        inputDisplay: 'Endpoint Health'
      },
      {
        value: 'syn-packets',
        inputDisplay: 'SYN Packets'
      }
    ];

    this.columns = [
      {
        field: 'host-a-ip',
        name: 'IP - Host A',
        sortable: true,
        width: '12%'
      },
      {
        field: 'host-a-port',
        name: 'Port - Host A',
        width: '12%',
        sortable: true
      },
      {
        field: 'host-b-ip',
        name: 'IP - Host B',
        sortable: true,
        width: '12%'
      },
      {
        field: 'host-b-port',
        name: 'Port - Host B',
        width: '12%',
        sortable: true
      },
      {
        field: 'first-packet',
        name: 'First Packet',
        sortable: true
      },
      {
        field: 'last-packet',
        name: 'Last Packet',
        sortable: true
      },
      {
        field: 'stats-a-to-b',
        sortable: (row) => row['stats-a-to-b'][this.state.selectedDetail],
        name: 'A -> B',
        render: (stats) => {
          // If the score hasn't been updated for the first time, just set to 0
          return (typeof stats[this.state.selectedDetail] === 'undefined'
            ? 0
            : stats[this.state.selectedDetail]
          ).toLocaleString();
        }
      },
      {
        field: 'stats-b-to-a',
        sortable: (row) => row['stats-b-to-a'][this.state.selectedDetail],
        name: 'B -> A',
        render: (stats) => {
          // If the score hasn't been updated for the first time, just set to 0
          return (typeof stats[this.state.selectedDetail] === 'undefined'
            ? 0
            : stats[this.state.selectedDetail]
          ).toLocaleString();
        }
      }
    ];

    this.pagination = {
      initialPageSize: 5,
      pageSizeOptions: [5, 7, 9]
    };
  }

  // For each flow in state.data.entry, computes and assigns the corresponding scores
  // for network, endpoint
  // This function might be hard to understand, look at
  // https://stackoverflow.com/questions/43638938/updating-an-object-with-setstate-in-react
  // in order to see why we go through such complexity to update this one object
  updateNetworkScores = () => {
    this.setState((prevState) => {
      // Make sure data exists and is a valid array
      if (prevState.data.entry) {
        // Before updating state, check if the provided expression contains
        // any unknown variables. This is a way to check for typos or undefined
        // variable names from 'stats' field in each flow.
        if (
          !isExpressionValid(
            this.state.exprNetworkCompiled,
            prevState.data.entry[0]['stats-a-to-b']
          )
        ) {
          const htmlId = htmlIdGenerator();
          const errToast = {
            id: htmlId('invalid-expression'),
            title: 'Error parsing expression: Network Health',
            color: 'danger',
            iconType: 'alert',
            text: (
              <p>
                Error parsing Network scoring expression. Make sure variable
                names correspond to the ones defined
              </p>
            )
          };
          this.props.displayToasts([errToast]);
          return prevState;
        }

        return {
          data: {
            ...prevState.data,
            entry: prevState.data.entry.map((flow) => ({
              ...flow,
              'stats-a-to-b': {
                ...flow['stats-a-to-b'],
                'network-score': evaluateExpr(
                  this.state.exprNetworkCompiled,
                  flow['stats-a-to-b']
                )
              },
              'stats-b-to-a': {
                ...flow['stats-b-to-a'],
                'network-score': evaluateExpr(
                  this.state.exprNetworkCompiled,
                  flow['stats-b-to-a']
                )
              }
            }))
          }
        };
      }

      return prevState;
    });

    this.setState({ loading: false });
  };

  // For each flow in state.data.entry, computes and assigns the corresponding scores
  // for network, endpoint
  // This function might be hard to understand, look at
  // https://stackoverflow.com/questions/43638938/updating-an-object-with-setstate-in-react
  // in order to see why we go through such complexity to update this one object
  updateEndpointScores = () => {
    this.setState((prevState) => {
      // Make sure data exists and is a valid array
      if (prevState.data.entry) {
        // Before updating state, check if the provided expression contains
        // any unknown variables. This is a way to check for typos or undefined
        // variable names from 'stats' field in each flow.
        if (
          !isExpressionValid(
            this.state.exprEndpointCompiled,
            prevState.data.entry[0]['stats-a-to-b']
          )
        ) {
          const htmlId = htmlIdGenerator();
          const errToast = {
            id: htmlId('invalid-expression'),
            title: 'Error parsing expression: Endpoint Health',
            color: 'danger',
            iconType: 'alert',
            text: (
              <p>
                Error parsing Endpoint scoring expression. Make sure variable
                names correspond to the ones defined
              </p>
            )
          };
          this.props.displayToasts([errToast]);
          return prevState;
        }

        return {
          data: {
            ...prevState.data,
            entry: prevState.data.entry.map((flow) => ({
              ...flow,
              'stats-a-to-b': {
                ...flow['stats-a-to-b'],
                'endpoint-score': evaluateExpr(
                  this.state.exprEndpointCompiled,
                  flow['stats-a-to-b']
                )
              },
              'stats-b-to-a': {
                ...flow['stats-b-to-a'],
                'endpoint-score': evaluateExpr(
                  this.state.exprEndpointCompiled,
                  flow['stats-b-to-a']
                )
              }
            }))
          }
        };
      }

      return prevState;
    });

    this.setState({ loading: false });
  };

  componentDidMount() { }

  onChangeDetail(selectedDetail) {
    this.setState({ selectedDetail });
  }

  toggleScoringPage = () => {
    this.setState((prevState) => ({
      showScoringPage: !prevState.showScoringPage
    }));
  };

  getExprTypeFromSelectedDetail = () => {
    if (this.state.selectedDetail === 'network-score') {
      return 'exprNetwork';
    } else if (this.state.selectedDetail === 'endpoint-score') {
      return 'exprEndpoint';
    } else {
      return '';
    }
  };

  // Render the selection for the expression when scoring is selected
  // And the button to display the config page
  renderExpressionSelection = () => {
    if (this.getExprTypeFromSelectedDetail() !== '') {
      return (
        <EuiFlexItem>
          <EuiFormRow
            label="Scoring"
            style={{ marginTop: '-12px', minWidth: '200px' }}
          >
            <ScoringPage
              exprType={this.getExprTypeFromSelectedDetail()}
              renderSelectionOnly={true}
              displayToasts={this.props.displayToasts}
              onChangeExpr={this.onChangeExpr}
              controller={this.props.controller}
            />
          </EuiFormRow>
        </EuiFlexItem>
      );
    }
  };

  renderExpressionConfigButton = () => {
    if (this.getExprTypeFromSelectedDetail() !== '') {
      return (
        <EuiFlexItem>
          <EuiButton onClick={this.toggleScoringPage}>Edit Scoring</EuiButton>
        </EuiFlexItem>
      );
    }
  };

  renderToolsRight = () => {
    // negative margin because of label and because
    // the table component does not let us style the search properly
    return (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        {this.renderExpressionConfigButton()}
        {this.renderExpressionSelection()}

        <EuiFlexItem>
          <EuiFormRow
            label="Select Column"
            style={{ marginTop: '-12px', minWidth: '200px' }}
          >
            <EuiSuperSelect
              options={this.detailOptions}
              valueOfSelected={this.state.selectedDetail}
              onChange={this.onChangeDetail}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  // Update state for network expr or endpoint expr
  onChangeExpr = (expr, type) => {
    this.setState({ loading: true });
    if (type === 'exprNetwork') {
      this.setState(
        {
          exprNetworkString: expr,
          exprNetworkCompiled: getCompiledExpression(expr)
        },
        this.updateNetworkScores // update scores after state is set
      );
    } else if (type === 'exprEndpoint') {
      this.setState(
        {
          exprEndpointString: expr,
          exprEndpointCompiled: getCompiledExpression(expr)
        },
        this.updateEndpointScores // update scores after state is set
      );
    } else {
      console.log('Error. Should not be another type yet');
      this.setState({ loading: false });
    }
  };

  returnToResults = () => {
    this.setState({
      showScoringPage: false
    });
  };
  onQueryChange = ({ query, error }) => {
    if (error) {
      return;
    }
    this.setState({
      query: query
    });
  };

  getItemString(item) {
    let item_string = `${item['host-a-ip']} ${item['host-a-port']} `;
    item_string += `${item['host-b-ip']} ${item['host-b-port']} `;
    item_string += `${item['first-packet']} ${item['last-packet']} `;
    item_string += item['stats-a-to-b'][this.state.selectedDetail] ? `${item['stats-a-to-b'][this.state.selectedDetail]} ` : '0';
    item_string += item['stats-b-to-a'][this.state.selectedDetail] ? `${item['stats-b-to-a'][this.state.selectedDetail]} ` : '0';
    return item_string;
  }
  onQueryChangeCustom = ({ query, error }) => {
    if (error) {
      return;
    }
    clearTimeout(this.debounceTimeoutId);
    clearTimeout(this.requestTimeoutId);

    this.debounceTimeoutId = setTimeout(() => {
      this.setState({
        loading: true
      });

      this.requestTimeoutId = setTimeout(() => {
        const items = this.state.data.entry.filter((item) => {
          let itemString = this.getItemString(item)
          const normalizedItemString = itemString.toLowerCase();
          const normalizedQuery = query.text.toLowerCase().replace(/['"]+/g, '');
          return normalizedItemString.indexOf(normalizedQuery) !== -1;
        });

        this.setState({
          loading: false,
          items: items,
          query: query
        });
      }, 1000);
    }, 300);
  };

  renderHelp() {
    return (
      <EuiModal onClose={() => this.setState({ showHelp: false })}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>Search Help</h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiTitle size="s"><h3>Basic Exact String Match</h3></EuiTitle>
          <EuiText>
            Takes the raw string and does an exact match of the string across all fields per entry.
            The search text can be encapsulated in quotes to escape special characters such as colons in the time string.
          </EuiText>
          <EuiTitle size="s"><h3>Query String Syntax</h3></EuiTitle>
          <EuiText>
            The <EuiLink target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html">query string syntax </EuiLink>
            allows for more sophisticated search. Such as searching fields in specific columns e.g 'host-b-port:8080'. The following ids are required for column search:
            <EuiBasicTable
              columns={[
                {field: 'name', name: 'Column Name'},
                {field: 'field', name: 'Field Name'}
              ]}
              items={this.columns}
              tableLayout='fixed'
            />
          </EuiText>
        </EuiModalBody>
      </EuiModal>
    )
  }

  renderToggles() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content="Selects between basic exact string matching and
          Query Search Syntax which allows for more sophisticated search see help for details">
            <EuiSwitch
              label="Query String Syntax"
              checked={this.state.queryStringSyntax}
              onChange={() => this.setState({ queryStringSyntax: !this.state.queryStringSyntax })}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {this.state.showHelp && this.renderHelp()}
          <EuiToolTip position="top" content="Gives more information on the search options">
            <EuiButtonIcon
              onClick={() => this.setState({ showHelp: true })}
              iconType="help"
              aria-label="Help"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    )
  }

  render() {
    const search = {
      toolsRight: this.renderToolsRight(),
      box: {
        incremental: !this.state.queryStringSyntax,
        schema: true,
      }
    };

    let queriedItems;
    if (this.state.queryStringSyntax) {
      search['query'] = this.state.query;
      search["onChange"] = this.onQueryChange;
      queriedItems = this.state.data.entry;
    } else {
      search["onChange"] = this.onQueryChangeCustom;
      queriedItems = this.state.items ? this.state.items : [];
    }

    const returnButton = (
      <EuiButton onClick={this.returnToResults} iconType="editorUndo">
        Back to results
      </EuiButton>
    );

    return (
      // the padding is used to avoid the search bar from overflowing
      <div style={{ padding: '0px 8px' }}>
        {this.state.showScoringPage ? (
          <Fragment>
            <ScoringPage
              onChangeExpr={this.onChangeExpr}
              exprNetwork={this.state.exprNetworkString}
              exprEndpoint={this.state.exprEndpointString}
              exprType={this.getExprTypeFromSelectedDetail()}
              displayToasts={this.props.displayToasts}
              returnButton={returnButton}
              controller={this.props.controller}
            />
          </Fragment>
        ) : (
          <Fragment>
            {this.renderToggles()}
            <EuiInMemoryTable
              items={queriedItems}
              columns={this.columns}
              pagination={this.pagination}
              sorting={true}
              search={search}
              loading={this.state.loading}
            />
          </Fragment>
        )}
      </div>
    );
  }
}
