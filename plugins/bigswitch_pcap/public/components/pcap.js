import MainContainer from './MainContainer';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

const PcapVis = (Private) => {
  const VisFactory = Private(VisFactoryProvider);

  return VisFactory.createReactVisualization({
    name: 'pcap',
    title: 'Recorder Node',
    icon: 'database',
    description: 'See information about packets',
    visConfig: {
      component: MainContainer
    },
    requestHandler: 'none',
    responseHandler: 'none'
  });
};

VisTypesRegistryProvider.register(PcapVis);
