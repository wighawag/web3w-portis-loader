"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortisModuleLoader = void 0;
const named_logs_1 = require("named-logs");
const console = named_logs_1.logs('web3w-portis:index');
let Portis;
function loadJS(url, integrity, crossorigin) {
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
        script.onload = script.onreadystatechange = function () {
            resolve();
        };
        script.onerror = function () {
            reject();
        };
        document.head.appendChild(script);
    });
}
const knownChainIds = {
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
};
class PortisModule {
    constructor(dappId, config) {
        this.id = 'portis';
        this.dappId = dappId;
        this.forceFallbackUrl = config && config.forceFallbackUrl;
        this.fallbackUrl = config && config.fallbackUrl;
        this.chainId = config && config.chainId;
        this.config = config;
    }
    setup(config) {
        return __awaiter(this, void 0, void 0, function* () {
            config = config || {};
            let { chainId, fallbackUrl } = config;
            chainId = chainId || this.chainId;
            fallbackUrl = fallbackUrl || this.fallbackUrl;
            if (fallbackUrl && !chainId) {
                const response = yield fetch(fallbackUrl, {
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
                const json = yield response.json();
                chainId = parseInt(json.result.slice(2), 16).toString();
            }
            if (!chainId) {
                throw new Error(`chainId missing`);
            }
            const knownNetwork = knownChainIds[chainId];
            let network;
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
            window.portis = this.portis;
            this.portis.onError((error) => {
                console.error('PORTIS ERROR:');
                console.error(error);
            });
            this.portis.onActiveWalletChanged((walletAddress) => {
                console.log('PORTIS address: ' + walletAddress);
            });
            this.portis.onLogout(() => {
                console.log('PORTIS logout ');
            });
            this.portis.onLogin((walletAddress, email, reputation) => {
                console.log('PORTIS login: ' + walletAddress + ',' + email + ',' + reputation);
            });
            return {
                web3Provider: this.portis.provider,
                chainId,
            };
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.portis.logout();
        });
    }
    isLoggedIn() {
        return this.portis.isLoggedIn();
    }
    onAccountsChanged(func) {
        this.portis.onActiveWalletChanged((newAddress) => {
            func([newAddress]);
        });
    }
}
class PortisModuleLoader {
    constructor(dappId, config) {
        this.id = 'portis';
        this.dappId = dappId;
        if (config && config.jsURL) {
            this.jsURL = config.jsURL;
            this.jsURLIntegrity = config.jsURLIntegrity;
        }
        else {
            this.jsURL = 'https://cdn.jsdelivr.net/npm/@portis/web3@2.0.0-beta.56/umd/index.js';
            this.jsURLIntegrity = 'sha256-YglsZuKbHpe2+U4HYCd3juAiADRTU7Ys2AGfCGY+Nmo==';
        }
        this.moduleConfig = config;
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Portis) {
                const url = this.jsURL;
                const integrity = this.jsURLIntegrity;
                yield loadJS(url, integrity, 'anonymous');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Portis = window.Portis;
            }
            return new PortisModule(this.dappId, this.moduleConfig);
        });
    }
}
exports.PortisModuleLoader = PortisModuleLoader;
