import React, { Component, Fragment } from 'react';

import { EuiInMemoryTable } from '@elastic/eui';

export class HostsTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: this.props.data.entry
    };

    this.columns = [
      {
        field: 'ip-address',
        name: 'IP Address',
        sortable: true
      },
      {
        field: 'host-name',
        name: 'Host Name',
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
