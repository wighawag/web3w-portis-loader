import type { Web3WModule, Web3WModuleLoader } from 'web3w';
declare type PortisConfig = any;
export declare class PortisModuleLoader implements Web3WModuleLoader {
    readonly id: string;
    private dappId;
    private static _jsURL;
    private static _jsURLIntegrity;
    private static _jsURLUsed;
    private moduleConfig;
    static setJsURL(jsURL: string, jsURLIntegrity?: string): void;
    constructor(dappId: string, config?: {
        forceFallbackUrl?: boolean;
        fallbackUrl?: string;
        chainId?: string;
        config?: PortisConfig;
    });
    load(): Promise<Web3WModule>;
}
export {};
//# sourceMappingURL=index.d.ts.map