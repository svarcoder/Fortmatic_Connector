import type { ExternalProvider } from "@ethersproject/providers";
import type { Actions, Provider } from "@web3-react/types";
import { Connector } from "@web3-react/types";

type FormaticProvider = Provider;

/**
 * @param apiKey - apiKey which you will get from fortmatic dashboard`
 * @param network - the network with which you want to connect your wallet.
 */
export interface FortmaticConstructorArgs {
  apiKey: string;
  network?: any;
}

export class Fortmatic extends Connector {
  private readonly apiKey: string;
  private readonly network: any;
  public fortmatic?: any;
  public provider?: FormaticProvider;

  constructor(actions: Actions, { apiKey, network }: FortmaticConstructorArgs) {
    super(actions);
    this.apiKey = apiKey;
    this.network = network;
  }

  private async startListening(configuration: any): Promise<void> {
    return import("fortmatic").then(async (m) => {
      this.fortmatic = new m.default(this.apiKey, this.network);

      const [Web3Provider, Eip1193Bridge] = await Promise.all([
        import("@ethersproject/providers").then(
          ({ Web3Provider }) => Web3Provider
        ),
        import("@ethersproject/experimental").then(
          ({ Eip1193Bridge }) => Eip1193Bridge
        ),
      ]);

      const provider = new Web3Provider(
        this.fortmatic.getProvider() as unknown as ExternalProvider
      );

      this.provider = new Eip1193Bridge(provider.getSigner(), provider);
    });
  }

  public async activate(configuration: any): Promise<void> {
    this.actions.startActivation();

    await this.startListening(configuration).catch((error: Error) => {
      console.error("error", error);
    });
    console.log("this.provider, this.fortmatic", this.provider, this.fortmatic);
    if (this.provider) {
      await Promise.all([
        this.provider.request({ method: "eth_chainId" }) as Promise<string>,
        this.provider.request({ method: "eth_accounts" }) as Promise<string[]>,
      ])
        .then(([chainId, accounts]) => {
          this.actions.update({
            chainId: Number.parseInt(chainId, 16),
            accounts,
          });
          this.fortmatic.user.deposit();
        })
        .catch((error: Error) => {
          console.error("error", error);
        });
    }
  }

  /** {@inheritdoc Connector.deactivate} */
  public async deactivate(): Promise<void> {
    this.fortmatic.user.logout();
    this.actions.resetState();
  }
}
