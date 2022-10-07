import React from 'react';

import { EuiIcon, EuiTitle, EuiToolTip } from '@elastic/eui';

export const Title = ({ title, description }) => (
  <EuiTitle size="s">
    <h2>
      {title}
      {description && (
        <EuiToolTip position="top" content={description}>
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      )}
    </h2>
  </EuiTitle>
);

export const SubTitle = ({ title, description }) => (
  <EuiTitle size="xs">
    <h4>
      {title}
      {description && (
        <EuiToolTip position="top" content={description}>
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      )}
    </h4>
  </EuiTitle>
);
