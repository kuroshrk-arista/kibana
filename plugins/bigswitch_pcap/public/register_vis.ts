import { PluginInitializerContext, CoreSetup } from 'kibana/public';

import { PcapPluginSetupDependencies, PcapPluginStartDependencies } from './types';
import { createPcapVisFn } from './pcap_vis_fn';
import { getPcapVisRenderer } from './pcap_vis_renderer';
import { getPcapVisTypeDefinition } from './pcap_vis_type';

export const registerPcapVis = async (
  core: CoreSetup<PcapPluginStartDependencies>,
  { data, expressions, visualizations }: PcapPluginSetupDependencies,
  context: PluginInitializerContext
) => {
  const [coreStart] = await core.getStartServices();
  expressions.registerFunction(createPcapVisFn);
  expressions.registerRenderer(getPcapVisRenderer(coreStart, data));
  visualizations.createBaseVisualization(getPcapVisTypeDefinition());
};
