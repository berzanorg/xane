// I extend the type of `window` to have type safety while accessing `window.mina`.
declare interface Window {
    /** 
     * The object Auro Wallet injects to allow websites to interact.
     * 
     * Learn more: https://docs.aurowallet.com/general/ 
     */
    mina?: {
        /** Makes a request to connect wallet and returns an array of addresses. Throws if user rejects. */
        requestAccounts(): Promise<Array<string>>
        /** Makes a request to connect wallet and returns an array of addresses. Sends an empty array if user rejects. */
        getAccounts(): Promise<Array<string>>
        /** Returns the name of the selected network. */
        requestNetwork(): Promise<'Mainnet' | 'Devnet' | 'Berkeley' | 'Testworld2' | 'Unknown'>
        /** Adds event listener for specified event using given handler. Currently only `accountsChanged` & `chainChanged` are supported. */
        on<T extends 'accountsChanged' | 'chainChanged'>(eventName: T, handler: (params: T extends 'accountsChanged' ? Array<string> : T extends 'chainChanged' ? string : never) => void): void
        /** Removes all the listeners added using `window.mina.on` function. */
        removeAllListeners(): void
    }
}