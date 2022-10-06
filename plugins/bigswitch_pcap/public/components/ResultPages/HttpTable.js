import React, { Component, Fragment } from 'react';
import { isEmpty } from 'lodash';

import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel
} from '@elastic/eui';
import { Title, SubTitle } from './utils';

import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';

const httpRequestColumns = [
  {
    field: 'method',
    name: 'Method'
  },
  {
    field: 'count',
    name: 'Count'
  }
];

const httpResponseColumns = [
  {
    field: 'response-code',
    name: 'Response Code'
  },
  {
    field: 'count',
    name: 'Count'
  }
];

export class HttpTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      itemIdToExpandedRowMap: {}
    };
  }

  renderRequests = () => {
    const { data = {} } = this.props;
    const { 'http-request': httpRequests = [] } = data;
    return (
      <EuiPanel>
        <Title title="HTTP Requests" />
        <EuiBasicTable items={httpRequests} columns={httpRequestColumns} />
      </EuiPanel>
    );
  };

  renderResponses = () => {
    const { data = {} } = this.props;
    const { itemIdToExpandedRowMap } = this.state;

    const { 'http-response-category': httpResponseCategories = [] } = data;
    return (
      <EuiPanel>
        <Title title="HTTP Response Categories" />
        <EuiBasicTable
          items={httpResponseCategories}
          itemId="response-category"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable={true}
          columns={this.getHttpResponseCategoryColumns()}
        />
      </EuiPanel>
    );
  };

  renderUnknown = () => {
    const { data = {} } = this.props;
    const {
      'unknown-http-request': unknownHttpRequest,
      'unknown-http-response': unknownHttpResponse
    } = data;
    return (
      <EuiPanel>
        <Title title="Unknown" />
        <EuiDescriptionList
          compressed
          listItems={[
            {
              title: '# of Unknown HTTP Requests',
              description: isEmpty(unknownHttpRequest)
                ? 0
                : unknownHttpRequest.count
            },
            {
              title: '# of Unknown HTTP Response',
              description: isEmpty(unknownHttpResponse)
                ? 0
                : unknownHttpResponse.count
            }
          ]}
        />
      </EuiPanel>
    );
  };

  getHttpResponseCategoryColumns = () => [
    {
      field: 'response-category',
      name: 'Response Category'
    },
    {
      field: 'count',
      name: 'Count'
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item) => {
        const { itemIdToExpandedRowMap } = this.state;
        return (
          <EuiButtonIcon
            onClick={() => this.toggleDetails(item)}
            aria-label={
              itemIdToExpandedRowMap[item['response-category']]
                ? 'Collapse'
                : 'Expand'
            }
            iconType={
              itemIdToExpandedRowMap[item['response-category']]
                ? 'arrowUp'
                : 'arrowDown'
            }
          />
        );
      }
    }
  ];

  toggleDetails = (item) => {
    const { itemIdToExpandedRowMap } = this.state;
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMap[item['response-category']]) {
      delete itemIdToExpandedRowMapValues[item['response-category']];
    } else {
      itemIdToExpandedRowMapValues[item['response-category']] = (
        <div style={{ width: 300 }}>
          <SubTitle title="HTTP Responses" />
          <EuiBasicTable
            items={item['http-response'] || []}
            columns={httpResponseColumns}
          />
        </div>
      );
    }
    this.setState({
      itemIdToExpandedRowMap: itemIdToExpandedRowMapValues
    });
  };

  render() {
    return (
      <Fragment>
        <EuiFlexGroup
          wrap={true}
          justifyContent="spaceBetween"
          alignItems="flexStart"
        >
          <EuiFlexItem>{this.renderRequests()}</EuiFlexItem>
          <EuiFlexItem>{this.renderUnknown()}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup
          wrap={true}
          justifyContent="spaceBetween"
          alignItems="flexStart"
        >
          <EuiFlexItem>{this.renderResponses()}</EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  }
}
