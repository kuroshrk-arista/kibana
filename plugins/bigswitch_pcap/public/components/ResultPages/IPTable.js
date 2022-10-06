import React, { Component, Fragment } from 'react';

import { EuiInMemoryTable } from '@elastic/eui';

export class IPTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: this.props.data.entry
    };

    this.columns = [
      {
        field: 'total-packets',
        name: 'Total Frames',
        sortable: true
      },
      {
        field: 'relative-start-seconds',
        name: 'Relation Start (s)',
        sortable: true
      },
      {
        field: 'client-ip',
        name: 'Client IP',
        sortable: true
      },
      {
        field: 'server-ip',
        name: 'Server IP',
        sortable: true
      },
      {
        field: 'client-to-server-bytes',
        name: 'Client to Server Bytes',
        sortable: true
      },
      {
        field: 'client-to-server-packets',
        name: 'Client to Server Frames',
        sortable: true
      },
      {
        field: 'server-to-client-bytes',
        name: 'Server to Client Bytes',
        sortable: true
      },
      {
        field: 'server-to-client-packets',
        name: 'Server to Client Frames',
        sortable: true
      },
      {
        field: 'duration-seconds',
        name: 'Duration (s)',
        sortable: true
      },
      {
        field: 'total-bytes',
        name: 'Total Bytes',
        sortable: true
      }
    ];
  }

  render() {
    return (
      <EuiInMemoryTable
        items={this.state.data}
        columns={this.columns}
        pagination={true}
      />
    );
  }
}
