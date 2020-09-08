import type { Web3WModule, Web3WModuleLoader } from 'web3w';
declare type PortisConfig = any;
export declare class PortisModuleLoader implements Web3WModuleLoader {
    readonly id: string;
    private dappId;
    private jsURL;
    private jsURLIntegrity;
    private moduleConfig;
    constructor(dappId: string, config?: {
        forceFallbackUrl?: boolean;
        fallbackUrl?: string;
        chainId?: string;
        config?: PortisConfig;
        jsURL?: string;
        jsURLIntegrity?: string;
    });
    load(): Promise<Web3WModule>;
}
export {};
//# sourceMappingURL=index.d.ts.map