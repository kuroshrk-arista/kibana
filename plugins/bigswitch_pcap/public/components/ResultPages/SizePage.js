import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';

export const SizePage = (props) => {
  return (
    <EuiFlexGroup alignItems="center" direction="column">
      <EuiFlexItem>
        <EuiStat
          textAlign="center"
          description="Packet Count"
          title={props.data['packet-count'].toLocaleString()}
          titleColor="secondary"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiStat
          textAlign="center"
          description="Aggregate Size"
          title={props.data['aggregate-size'].toLocaleString()}
          titleColor="secondary"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
