declare module "index" {
    import type { Web3WModule, Web3WModuleLoader } from 'web3w';
    type PortisConfig = any;
    export class PortisModuleLoader implements Web3WModuleLoader {
        readonly id: string;
        private dappId;
        private static _jsURL;
        private static _jsURLIntegrity;
        private static _jsURLUsed;
        private moduleConfig;
        static setJsURL(jsURL: string, jsURLIntegrity?: string): void;
        constructor(dappId: string, config?: {
            forceNodeUrl?: boolean;
            nodeUrl?: string;
            chainId?: string;
            config?: PortisConfig;
        });
        load(): Promise<Web3WModule>;
    }
}
//# sourceMappingURL=index.d.ts.map