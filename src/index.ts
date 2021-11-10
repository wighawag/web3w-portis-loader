import type {Web3WModule, WindowWeb3Provider, Web3WModuleLoader} from 'web3w';
import {logs} from 'named-logs';
const console = logs('web3w-portis:index');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PortisConfig = any;
// type PortisConfig = {
//   scope: string[];
//   gasRelay: boolean;
// }

type Config = {
  chainId?: string;
  nodeUrl?: string;
};

type GeneralConfig = Config & {
  forceNodeUrl?: boolean;
  config?: PortisConfig;
};

type PortisJS = any; // TODO ?
let Portis: any;

function loadJS(url: string, integrity: string | undefined, crossorigin: string) {
  return new Promise<void>(function (resolve, reject) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    if (integrity) {
      script.integrity = integrity;
    }
    if (crossorigin) {
      script.crossOrigin = crossorigin;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    script.onload = (script as any).onreadystatechange = function () {
      resolve();
    };
    script.onerror = function () {
      reject();
    };
    document.head.appendChild(script);
  });
}

const knownChainIds: {[chainId: string]: string} = {
  '1': 'mainnet',
  '3': 'ropsten',
  '4': 'rinkeby',
  '5': 'goerli',
  '8': 'ubiq',
  '18': 'thundercoreTestnet',
  // TODO chainId '': 'orchid',
  // TODO chainId '': 'orchidTestnet',
  '42': 'kovan',
  '61': 'classic',
  '77': 'sokol',
  '99': 'core',
  '100': 'xdai',
  '108': 'thundercore',
  // TODO chainId '': 'fuse',
  '163': 'lightstreams',
  // TODO chainId '': 'maticAlpha',
  // TODO chainId '': 'maticTestnet' // is that testnet3 ?
};

class PortisModule implements Web3WModule {
  public readonly id = 'portis';
  private dappId: string;
  private forceNodeUrl: boolean | undefined;
  private nodeUrl: string | undefined;
  private chainId: string | undefined;
  private config: PortisConfig | undefined;

  private portis: PortisJS;

  constructor(dappId: string, config?: GeneralConfig) {
    this.dappId = dappId;
    this.forceNodeUrl = config && config.forceNodeUrl;
    this.nodeUrl = config && config.nodeUrl;
    this.chainId = config && config.chainId;
    this.config = config;
  }

  async setup(config?: Config): Promise<{chainId: string; web3Provider: WindowWeb3Provider}> {
    config = config || {};
    let {chainId, nodeUrl} = config;
    chainId = chainId || this.chainId;
    nodeUrl = nodeUrl || this.nodeUrl;

    if (nodeUrl && !chainId) {
      const response = await fetch(nodeUrl, {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          id: Math.floor(Math.random() * 1000000),
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
        }),
        method: 'POST',
      });
      const json = await response.json();
      chainId = parseInt(json.result.slice(2), 16).toString();
    }

    if (!chainId) {
      throw new Error(`chainId missing`);
    }

    const knownNetwork = knownChainIds[chainId];

    let network: string | undefined | {nodeUrl: string; chainId: number};
    if (knownNetwork && !this.forceNodeUrl) {
      network = knownNetwork;
    }

    const chainIdAsNumber = parseInt(chainId);

    if (!network && nodeUrl) {
      network = {
        nodeUrl: nodeUrl,
        chainId: chainIdAsNumber,
      };
      console.log('PORTIS with ' + network.nodeUrl + ' ' + chainId);
    }
    if (!network) {
      throw new Error(`chain (${chainId}) not supported by portis`);
    }
    this.portis = new Portis(this.dappId, network, this.config);

    this.portis.onError((error: unknown) => {
      console.error('PORTIS ERROR:');
      console.error(error);
    });
    this.portis.onActiveWalletChanged((walletAddress: string) => {
      console.log('PORTIS address: ' + walletAddress);
    });
    this.portis.onLogout(() => {
      console.log('PORTIS logout ');
    });
    this.portis.onLogin((walletAddress: string, email: string, reputation: unknown) => {
      console.log('PORTIS login: ' + walletAddress + ',' + email + ',' + reputation);
    });

    // TODO remove:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).portis = this.portis;

    return {
      web3Provider: this.portis.provider,
      chainId,
    };
  }

  logout(): Promise<void> {
    return this.portis.logout();
  }

  disconnect(): void {
    this.portis = undefined;

    // TODO remove
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).portis = undefined;
  }

  isLoggedIn(): Promise<boolean> {
    return this.portis.isLoggedIn();
  }

  onAccountsChanged(func: (accounts: string[]) => void) {
    this.portis.onActiveWalletChanged((newAddress: string) => {
      func([newAddress]);
    });
  }
}

export class PortisModuleLoader implements Web3WModuleLoader {
  public readonly id: string = 'portis';
  private dappId: string;

  private static _jsURL = 'https://cdn.jsdelivr.net/npm/@portis/web3@4.0.5/umd/index.js';
  private static _jsURLIntegrity: string | undefined = 'sha256-aM3fufPaYwpd/pxdjTcjd8OpCHh8tfw+sWjhjs5x6I4=';
  private static _jsURLUsed = false;

  private moduleConfig: GeneralConfig | undefined;

  static setJsURL(jsURL: string, jsURLIntegrity?: string): void {
    if (PortisModuleLoader._jsURLUsed) {
      throw new Error(`cannot change js url once used`);
    }
    PortisModuleLoader._jsURL = jsURL;
    PortisModuleLoader._jsURLIntegrity = jsURLIntegrity;
  }

  constructor(
    dappId: string,
    config?: {
      forceNodeUrl?: boolean;
      nodeUrl?: string;
      chainId?: string;
      config?: PortisConfig;
    }
  ) {
    this.dappId = dappId;
    this.moduleConfig = config;
  }

  async load(): Promise<Web3WModule> {
    if (!Portis) {
      const url = PortisModuleLoader._jsURL;
      const integrity = PortisModuleLoader._jsURLIntegrity;
      PortisModuleLoader._jsURLUsed = true;
      try {
        await loadJS(url, integrity, 'anonymous');
      } catch (e) {
        PortisModuleLoader._jsURLUsed = false;
        throw e;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Portis = (window as any).Portis;
    }
    return new PortisModule(this.dappId, this.moduleConfig);
  }
}
