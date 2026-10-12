export {};

declare global {
  type PrivateDaoEip1193Provider = {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    providers?: PrivateDaoEip1193Provider[];
  };

  interface Window {
    ethereum?: PrivateDaoEip1193Provider;
  }
}
