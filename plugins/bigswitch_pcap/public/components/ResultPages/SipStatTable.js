import React, { Component, Fragment } from 'react';

import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer
} from '@elastic/eui';
import { Title } from './utils';

export class SipStatTable extends Component {
  renderRequestMethods = () => {
    const { data = {} } = this.props;
    const { 'sip-request-method': methods } = data;
    return (
      <EuiPanel paddingSize="m">
        <Title title="SIP Request Methods" />
        <EuiSpacer />
        <EuiInMemoryTable
          items={methods}
          columns={[
            {
              field: 'method',
              name: 'Method'
            },
            {
              field: 'count',
              name: 'Count'
            }
          ]}
        />
      </EuiPanel>
    );
  };

  renderReplyCodes = () => {
    const { data = {} } = this.props;
    const { 'sip-reply-code': codes } = data;
    return (
      <EuiPanel paddingSize="m">
        <Title title="SIP Reply Codes" />
        <EuiSpacer />
        <EuiInMemoryTable
          items={codes}
          columns={[
            {
              field: 'code',
              name: 'Code'
            },
            {
              field: 'code-string',
              name: 'Code String'
            },
            {
              field: 'count',
              name: 'Count'
            }
          ]}
        />
      </EuiPanel>
    );
  };

  renderHealth = () => {
    const { data = {} } = this.props;

    return (
      <EuiPanel paddingSize="m">
        <Title title="SIP Health" />
        <EuiSpacer />
        <EuiDescriptionList
          compressed
          listItems={[
            {
              title: 'Average SIP Setup Time (in ms)',
              description: data['setup-time-average-ms'] || '-'
            },
            {
              title: 'Min. SIP Setup Time (in ms)',
              description: data['setup-time-min'] || '-'
            },
            {
              title: 'Max. SIP Setup Time (in ms)',
              description: data['setup-time-max'] || '-'
            }
          ]}
        />
      </EuiPanel>
    );
  };

  render() {
    return (
      <EuiFlexGroup
        wrap={true}
        justifyContent="spaceBetween"
        alignItems="flexStart"
      >
        <EuiFlexItem style={{ minWidth: 250 }}>
          {this.renderHealth()}
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 250 }}>
          {this.renderRequestMethods()}
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 250 }}>
          {this.renderReplyCodes()}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
