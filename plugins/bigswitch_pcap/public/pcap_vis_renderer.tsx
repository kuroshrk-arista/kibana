import React from 'react';
import { CoreStart } from 'kibana/public';
import { ExpressionRenderDefinition } from 'src/plugins/expressions';
import { render, unmountComponentAtNode } from 'react-dom';
// @ts-ignore
import MainContainer from './components/MainContainer.js';
import { DataPublicPluginSetup } from 'src/plugins/data/public/types.js';


export const getPcapVisRenderer: (
	core: CoreStart,
    deps: DataPublicPluginSetup
) => ExpressionRenderDefinition<void> = (core, data) => ({
	name: 'pcap',
	reuseDomNode: true,
	render: async (domNode, config, handlers) => {
        handlers.onDestroy(() => {
            unmountComponentAtNode(domNode);
          });
        render(<MainContainer core={core} data={data}/>, domNode);
        handlers.done();
	},
});
