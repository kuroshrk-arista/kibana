// Used to display embedded visualizations from Kibana
// for TCP flow health queries

import React, { Fragment } from 'react';

import { getVisualizeLoader } from 'ui/visualize/loader';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiLoadingSpinner,
  EuiFormRow
} from '@elastic/eui';

export class EmbeddedPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visNotFound: false,
      loading: true,
      embeddedHandler: null,
      selectedGraph: 'throughput-bytes-per-second'
    };

    this.options = [
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
      }
    ];
  }

  componentDidMount() {
    this.embedVisualization(this.state.selectedGraph);
  }

  // Find and embed the visualization
  embedVisualization = (title) => {
    this.setState({ loading: true });
    // Get container into which we will embed
    const container = document.getElementById('embed-container');

    getVisualizeLoader().then((loader) => {
      const searchTerm = title.substring(0, 3);
      loader.savedVisualizations.find(searchTerm).then((list) => {
        let visualizationID = null;
        list.hits.forEach((vis) => {
          if (vis.title === title) {
            visualizationID = vis.id;
          }
        });

        // If visualization isn't found, ID will be null
        if (visualizationID == null) {
          this.setState({ visNotFound: true, loading: false });
          return;
        } else {
          this.setState({ visNotFound: false }, () => {
            const handlerPromise = loader.embedVisualizationWithId(
              container,
              visualizationID,
              { timeRange: this.props.timeRange }
            );
            handlerPromise
              .then((handler) => {
                this.setState({ embeddedHandler: handler, loading: false });
              })
              .catch(() => {
                this.setState({ loading: false });
              });
          });
        }
      });
    });
  };

  componentWillUnmount() {
    // must destroy vis handler
    if (this.state.embeddedHandler !== null) {
      this.state.embeddedHandler.destroy();
    }
  }

  onChangeGraph = (selectedGraph) => {
    if (selectedGraph !== this.state.selectedGraph) {
      this.setState(
        { selectedGraph },
        () => {
          if (this.state.embeddedHandler !== null) {
            this.state.embeddedHandler.destroy();
          }
          this.forceUpdate(); // need to tell react to rerender completely in order to recreate the div that we will embed into
          this.embedVisualization(this.state.selectedGraph);
        } // update graph to newly selected one
      );
    }
  };

  renderGraph = () => {
    if (this.state.visNotFound) {
      return (
        <div>
          <h1>
            Visualization with the following title not found:{' '}
            {this.state.selectedGraph}
          </h1>
        </div>
      );
    }
  };

  render() {
    return (
      <div style={{ height: 'calc(100% - 130px)' }}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem>
            <EuiFormRow label="Select Graph">
              <EuiSuperSelect
                options={this.options}
                valueOfSelected={this.state.selectedGraph}
                onChange={this.onChangeGraph}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        {this.renderGraph()}

        {this.state.loading && (
          <Fragment>
            <EuiLoadingSpinner size="xl" />
          </Fragment>
        )}

        <div id="embed-container" style={{ width: '100%', height: '100%' }} />
      </div>
    );
  }
}
