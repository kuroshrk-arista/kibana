import React, { Component, Fragment } from 'react';

import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer
} from '@elastic/eui';
import { Title, SubTitle } from './utils';

const NameCountTable = ({ items }) => (
  <EuiInMemoryTable
    items={items}
    columns={[
      {
        field: 'name',
        name: 'Name'
      },
      {
        field: 'count',
        name: 'Count'
      }
    ]}
  />
);

export class DnsTable extends Component {
  renderQuery = () => {
    const { data = {} } = this.props;
    const { query = {} } = data;
    const {
      'query-name-length': queryNameLength,
      'query-level-count': queryLevelCount
    } = query;
    return (
      <EuiPanel paddingSize="m">
        <Title title="Query Stats" description="DNS query statistics" />
        <EuiSpacer />
        <EuiDescriptionList
          compressed
          listItems={[
            {
              title: 'Count',
              description: query['count']
            }
          ]}
        />
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <SubTitle title="Domain Name Stats" />
            <EuiSpacer />
            <EuiDescriptionList
              compressed
              listItems={[
                {
                  title: 'Min. Length',
                  description: queryNameLength['minimum-length']
                },
                {
                  title: 'Max. Length',
                  description: queryNameLength['maximum-length']
                },
                {
                  title: 'Average Length',
                  description: queryNameLength['average-length']
                }
              ]}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <SubTitle title="Query Level Stats" />
            <EuiSpacer />
            <EuiDescriptionList
              compressed
              listItems={[
                {
                  title: '# of Level 1 Queries',
                  description: queryLevelCount['level-1']
                },
                {
                  title: '# of Level 2 Queries',
                  description: queryLevelCount['level-2']
                },
                {
                  title: '# of Level 3 Queries',
                  description: queryLevelCount['level-3']
                },
                {
                  title: '# of Level 4+ Queries',
                  description: queryLevelCount['level-4-and-up']
                }
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  };

  renderResponse = () => {
    const { data = {} } = this.props;
    const { response = {} } = data;
    return (
      <EuiPanel paddingSize="m">
        <Title title="Response Stats" description="DNS response statistics" />
        <EuiSpacer />
        <EuiDescriptionList
          compressed
          listItems={[
            {
              title: '# of Questions',
              description: response['question-count']
            },
            {
              title: '# of Answers',
              description: response['answer-count']
            },
            {
              title: '# of Authorities',
              description: response['authority-count']
            },
            {
              title: '# of Additional Records',
              description: response['additional-record-count']
            },
            {
              title: '# of Unsolicited Responses',
              description: response['unsolicited-response-count']
            }
          ]}
        />
        <EuiSpacer />
        <SubTitle title="Return Codes" />
        <NameCountTable items={response['return-code'] || []} />
      </EuiPanel>
    );
  };

  renderClasses = () => {
    const { data = {} } = this.props;
    const { class: classes } = data;
    return (
      <EuiPanel paddingSize="m">
        <Title title="Classes" description="DNS classes observed" />
        <EuiSpacer />
        <NameCountTable items={classes} />
      </EuiPanel>
    );
  };

  renderOperationCodes = () => {
    const { data = {} } = this.props;
    const { 'operation-code': opCodes } = data;
    return (
      <EuiPanel paddingSize="m">
        <Title
          title="Operation Codes"
          description="DNS operation codes observed"
        />
        <EuiSpacer />
        <NameCountTable items={opCodes} />
      </EuiPanel>
    );
  };

  renderPayload = () => {
    const { data = {} } = this.props;
    const { payload } = data;
    return (
      <EuiPanel paddingSize="m">
        <Title
          title="Payload Stats"
          description="Request/response DNS payload statistics"
        />
        <EuiSpacer />
        <EuiDescriptionList
          compressed
          listItems={[
            {
              title: 'Min. Length',
              description: payload['minimum-length']
            },
            {
              title: 'Max. Length',
              description: payload['maximum-length']
            },
            {
              title: 'Avg. Length',
              description: payload['average-length']
            }
          ]}
        />
      </EuiPanel>
    );
  };

  renderRtt = () => {
    const { data = {} } = this.props;
    const { rtt } = data;
    return (
      <EuiPanel paddingSize="m">
        <Title
          title="RTT Stats"
          description="Round trip time stats for a request/response pair"
        />
        <EuiSpacer />
        <EuiDescriptionList
          compressed
          listItems={[
            {
              title: 'Min. Time (in ms)',
              description: rtt['minimum-ms']
            },
            {
              title: 'Max. Time (in ms)',
              description: rtt['maximum-ms']
            },
            {
              title: 'Avg. Time (in ms)',
              description: rtt['average-ms']
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
        <EuiFlexItem style={{ minWidth: 450 }}>
          {this.renderQuery()}
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 250 }}>
          {this.renderResponse()}
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 300 }}>
          {this.renderOperationCodes()}
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 300 }}>
          {this.renderClasses()}
        </EuiFlexItem>
        <EuiFlexItem>{this.renderPayload()}</EuiFlexItem>
        <EuiFlexItem>{this.renderRtt()}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
