import React, { Fragment } from 'react';

import {
  EuiInMemoryTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

export class AppIDPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selection: [],
      isFlowsTableVisible: false,
      selectionFlows: [],
      flows: []
    };

    this.columnsApp = [
      {
        field: 'name',
        name: 'Name',
        sortable: true
      },
      {
        field: 'associated-flow',
        name: '# of Flows',
        sortable: true,
        // the .flows number differs from the length of associatedFlow,
        // thus we show the length of the associated ones for consistency
        render: (associatedFlow) => associatedFlow.length.toLocaleString()
      },
      {
        field: 'packets',
        name: '# of Packets',
        sortable: true,
        render: (packets) => packets.toLocaleString()
      },
      {
        field: 'bytes',
        name: '# of Bytes',
        sortable: true,
        render: (bytes) => bytes.toLocaleString()
      }
    ];

    // for the second table once flows are selected
    this.columnsFlows = [
      {
        field: 'source-host',
        name: 'Source Host',
        sortable: true
      },
      {
        field: 'source-port',
        name: 'Source port',
        sortable: true
      },
      {
        field: 'destination-host',
        name: 'Destination Host',
        sortable: true
      },
      {
        field: 'destination-port',
        name: 'Destination Port',
        sortable: true
      },
      {
        name: 'Action',
        width: '105px',
        actions: [
          {
            name: 'TCP Health',
            description: 'See health of flows',
            onClick: this.submitOneFlowTCP,
            icon: 'arrowRight'
          }
        ]
      }
    ];

    this.sorting = {
      sort: {
        field: 'bytes',
        direction: 'desc'
      }
    };

    this.pagination = {
      initialPageSize: 7,
      pageSizeOptions: [5, 7, 9]
    };

    this.searchFlows = {
      toolsLeft: this.renderBackButton(),
      box: {
        incremental: true
      }
    };

    this.selection = {
      selectable: () => true, // make all selectable
      onSelectionChange: this.onSelectionChange
    };

    this.selectionFlows = {
      selectable: () => true, // make all selectable
      onSelectionChange: this.onFlowsSelectionChange
    };
  }

  onFlowsSelectionChange = (selection) => {
    this.setState({ selectionFlows: selection });
  };

  renderBackButton = () => {
    const onClick = () => {
      this.setState({ isFlowsTableVisible: false, selection: [] });
    };

    const onClickFlows = () => {
      this.submitMultipleFlowsTCP(this.state.selectionFlows);
    };

    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton fill iconType="editorUndo" onClick={onClick}>
            See Apps
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiButton fill onClick={onClickFlows}>
            Flow Health Query
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  renderExpandFlows = () => {
    const selection = this.state.selection;
    const onClick = () => {
      this.setState({
        isFlowsTableVisible: true,
        flows: this.getFlowsFromSelection()
      });
    };

    return (
      <EuiButton
        fill
        iconType="inspect"
        onClick={onClick}
        disabled={selection.length === 0}
      >
        See Flows
      </EuiButton>
    );
  };

  onSelectionChange = (selection) => {
    this.setState({ selection });
  };

  // for when multiple selections are made, combine them into one array
  getFlowsFromSelection = () => {
    let res = [];

    let id = 0;

    this.state.selection.forEach((selection) => {
      // for each flow, we need to add a unique ID in order to be able to select
      // it in the InMemoryTable
      const flows = selection['associated-flow'].map((flow) => {
        flow.id = id;
        ++id;
        return flow;
      });
      res = res.concat(flows);
    });
    return res;
  };

  // When the user wants a TCP health query done directly
  // on a selected flow. Allows user to go from AppID page directly
  // to the tcp health flow query instead of having to search again.
  submitOneFlowTCP = (flow) => {
    const newQuery = this.props.filters;

    // added as label in order to match format from SearchPage ComboBox
    newQuery.srcIps = [{ label: flow['source-host'] }];
    newQuery.destIps = [{ label: flow['destination-host'] }];
    newQuery.srcPort = flow['source-port'].toString();
    newQuery.destPort = flow['destination-port'].toString();
    newQuery.selectedFlowAnalysisType = 'analysis-tcp-flow-health';
    newQuery.selectedSearchType = 'flowanalysis';

    // submit tcp health query
    this.props.onSubmitSearchExternal(newQuery, this.props.getFlowAnalysis);
  };

  // When the user wants a TCP health query done directly
  // on a selected flow. Allows user to go from AppID page directly
  // to the tcp health flow query instead of having to search again.
  submitMultipleFlowsTCP = (flows) => {
    const newQuery = this.props.filters;

    // added as label in order to match format from SearchPage ComboBox
    newQuery.srcIps = flows.map((flow) => ({ label: flow['source-host'] }));
    newQuery.destIps = flows.map((flow) => ({
      label: flow['destination-host']
    }));
    newQuery.selectedFlowAnalysisType = 'analysis-tcp-flow-health';
    newQuery.selectedSearchType = 'flowanalysis';

    // submit tcp health query
    this.props.onSubmitSearchExternal(newQuery, this.props.getFlowAnalysis);
  };

  render() {
    // this is put here as opposed to constructor because
    // in constructor it's only initialized once, as opposed to on each render
    // whereas here it needs to change based on
    // this.renderExpandFlows
    const searchApp = {
      toolsLeft: this.renderExpandFlows(),
      box: {
        incremental: true
      }
    };

    return (
      <Fragment>
        {this.state.isFlowsTableVisible && (
          <EuiInMemoryTable
            items={this.state.flows}
            columns={this.columnsFlows}
            pagination={this.pagination}
            sorting={true}
            selection={this.selectionFlows}
            search={this.searchFlows}
            itemId="id"
            isSelectable={true}
          />
        )}

        {!this.state.isFlowsTableVisible && (
          <EuiInMemoryTable
            items={this.props.data.application}
            columns={this.columnsApp}
            pagination={this.pagination}
            sorting={this.sorting}
            search={searchApp}
            selection={this.selection}
            itemId="name" // selection needs a field for id. use name
            isSelectable={true}
          />
        )}
      </Fragment>
    );
  }
}
