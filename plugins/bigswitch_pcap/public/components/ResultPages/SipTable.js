import React, { Component } from 'react';
import { EuiInMemoryTable } from '@elastic/eui';

export class SipTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: this.props.data.entry,
      columns: [
        {
          field: 'call-id',
          name: 'Call ID',
          sortable: true
        },
        {
          field: 'call-start-time',
          name: 'Call Start Time',
          sortable: true
        },
        {
          field: 'from-ip',
          name: 'From IP',
          sortable: true
        },
        {
          field: 'from-port',
          name: 'From Port',
          sortable: true
        },
        {
          field: 'to-ip',
          name: 'To IP',
          sortable: true
        },
        {
          field: 'to-port',
          name: 'To Port',
          sortable: true
        },
        {
          field: 'from-user',
          name: 'From User',
          sortable: true
        },
        {
          field: 'to-user',
          name: 'To User',
          sortable: true
        },
        {
          field: 'transport-protocol',
          name: 'Protocol',
          sortable: true
        },
        {
          field: 'status-code',
          name: 'Status Code',
          sortable: true
        },
        {
          field: 'resend-count',
          name: 'Resend Count',
          sortable: true
        }
      ]
    };
  }

  render() {
    const search = {
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
