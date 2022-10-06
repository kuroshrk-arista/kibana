import { ExpressionFunctionDefinition } from '../../../src/plugins/expressions/public';

export type PcapExpressionFunctionDefinition = ExpressionFunctionDefinition<
    'pcap',
    string,
    {},
    { type: 'render', as: string, value: {} }
>;

export const createPcapVisFn = (): PcapExpressionFunctionDefinition => ({
    name: 'pcap',
    type: 'render',
    args: {},
    help: 'Pcap visualization',
    fn(input, args) {
        return {
            type: 'render',
            as: 'pcap',
            value: {},
        };
    }
});

