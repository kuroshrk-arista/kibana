import React, { Component } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInMemoryTable,
  EuiSuperSelect
} from '@elastic/eui';
import { find, indexOf, isEmpty } from 'lodash';

export class RtpStreamTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: this.props.data.entry,
      selectedDetail: 'packets',
      columns: [
        {
          field: 'source-ip',
          name: 'Source IP Address',
          sortable: true
        },
        {
          field: 'source-port',
          name: 'Source Port',
          sortable: true
        },
        {
          field: 'destination-ip',
          name: 'Destination IP Address',
          sortable: true
        },
        {
          field: 'destination-port',
          name: 'Destination Port',
          sortable: true
        }
      ]
    };

    this.detailOptions = [
      {
        value: 'synchronization-source',
        inputDisplay: 'Synchronization Source'
      },
      {
        value: 'payload',
        inputDisplay: 'Payload'
      },
      {
        value: 'packets',
        inputDisplay: '# of Packets'
      },
      {
        value: 'packets-lost',
        inputDisplay: '# of Packets Lost'
      },
      {
        value: 'packets-lost-percent',
        inputDisplay: '% of Packets Lost'
      },
      {
        value: 'max-delta-ms',
        inputDisplay: 'Maximum Delta (in ms)'
      },
      {
        value: 'max-jitter-ms',
        inputDisplay: 'Maximum Jitter (in ms)'
      },
      {
        value: 'average-jitter-ms',
        inputDisplay: 'Average Jitter (in ms)'
      }
    ];
  }

  getName = () => {
    let col = find(
      this.detailOptions,
      (col) => col.value === this.state.selectedDetail
    );
    return col.inputDisplay;
  };

  componentDidMount() {
    this.updateSelectedDetailColumn();
  }

  updateSelectedDetailColumn = () => {
    const { columns } = this.state;
    const requiredColumns = columns.slice(0, 4);
    const selectedDetailColumn = {
      field: this.state.selectedDetail,
      name: this.getName(),
      render: (cell) => {
        if (cell) {
          return cell;
        }
        return '-';
      }
    };

    this.setState({
      columns: [...requiredColumns, selectedDetailColumn]
    });
  };

  onChangeDetail = (selectedDetail) => {
    this.setState({ selectedDetail }, this.updateSelectedDetailColumn);
  };

  renderToolsRight = () => {
    // negative margin because of label and because
    // the table component does not let us style the search properly
    return (
      <EuiFlexGroup gutterSize="m" alignItems="center">
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

  render() {
    const search = {
      toolsRight: this.renderToolsRight(),
      box: {
        incremental: true
      }
    };

    return (
      <EuiInMemoryTable
        items={this.state.data}
        columns={this.state.columns}
        pagination={true}
        search={search}
      />
    );
  }
}
