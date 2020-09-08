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
  fallbackUrl?: string;
};

type GeneralConfig = Config & {
  forceFallbackUrl?: boolean;
  config?: PortisConfig;
};

type PortisJS = any; // TODO ?
let Portis: any;

function loadJS(url: string, integrity: string | undefined, crossorigin: string) {
  return new Promise(function (resolve, reject) {
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
  private forceFallbackUrl: boolean | undefined;
  private fallbackUrl: string | undefined;
  private chainId: string | undefined;
  private config: PortisConfig | undefined;

  private portis: PortisJS;

  constructor(dappId: string, config?: GeneralConfig) {
    this.dappId = dappId;
    this.forceFallbackUrl = config && config.forceFallbackUrl;
    this.fallbackUrl = config && config.fallbackUrl;
    this.chainId = config && config.chainId;
    this.config = config;
  }

  async setup(config?: Config): Promise<{chainId: string; web3Provider: WindowWeb3Provider}> {
    config = config || {};
    let {chainId, fallbackUrl} = config;
    chainId = chainId || this.chainId;
    fallbackUrl = fallbackUrl || this.fallbackUrl;

    if (fallbackUrl && !chainId) {
      const response = await fetch(fallbackUrl, {
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
    if (knownNetwork && !this.forceFallbackUrl) {
      network = knownNetwork;
    }

    const chainIdAsNumber = parseInt(chainId);

    if (!network && fallbackUrl) {
      network = {
        nodeUrl: fallbackUrl,
        chainId: chainIdAsNumber,
      };
      console.log('PORTIS with ' + network.nodeUrl + ' ' + chainId);
    }
    if (!network) {
      throw new Error(`chain (${chainId}) not supported by portis`);
    }
    this.portis = new Portis(this.dappId, network, this.config);

    // TODO remove:
    (window as any).portis = this.portis;

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
    return {
      web3Provider: this.portis.provider,
      chainId,
    };
  }

  logout(): Promise<void> {
    return this.portis.logout();
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

  private jsURL: string;
  private jsURLIntegrity: string | undefined;

  private moduleConfig: GeneralConfig | undefined;

  constructor(
    dappId: string,
    config?: {
      forceFallbackUrl?: boolean;
      fallbackUrl?: string;
      chainId?: string;
      config?: PortisConfig;
      jsURL?: string;
      jsURLIntegrity?: string;
    }
  ) {
    this.dappId = dappId;
    if (config && config.jsURL) {
      this.jsURL = config.jsURL;
      this.jsURLIntegrity = config.jsURLIntegrity;
    } else {
      this.jsURL = 'https://cdn.jsdelivr.net/npm/@portis/web3@2.0.0-beta.56/umd/index.js';
      this.jsURLIntegrity = 'sha256-YglsZuKbHpe2+U4HYCd3juAiADRTU7Ys2AGfCGY+Nmo==';
    }
    this.moduleConfig = config;
  }

  async load(): Promise<Web3WModule> {
    if (!Portis) {
      const url = this.jsURL;
      const integrity = this.jsURLIntegrity;
      await loadJS(url, integrity, 'anonymous');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Portis = (window as any).Portis;
    }
    return new PortisModule(this.dappId, this.moduleConfig);
  }
}
