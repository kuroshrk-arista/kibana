import React, { Component } from 'react';

import { EuiInMemoryTable } from '@elastic/eui';

export class HttpReqTable extends Component {
  getColumns = () => [
    {
      field: 'url',
      name: 'URL'
    },
    {
      field: 'count',
      name: 'Count'
    },
    {
      field: 'child-url',
      name: 'Child URL'
    },
    {
      field: 'parent-url',
      name: 'Parent URL'
    }
  ];

  render() {
    const { data = {} } = this.props;
    const { 'http-request': httpRequests = [] } = data;

    return (
      <EuiInMemoryTable
        items={httpRequests}
        columns={this.getColumns()}
        pagination={true}
      />
    );
  }
}
