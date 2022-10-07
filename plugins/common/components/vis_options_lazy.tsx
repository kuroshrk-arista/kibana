import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { VisEditorOptionsProps } from '../../../src/plugins/visualizations/public';

const OptionsComponent = lazy(() => import('./vis_options'));

export const Options = (props: VisEditorOptionsProps<{}>) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <OptionsComponent/>
  </Suspense>
);
