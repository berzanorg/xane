import { AccountUpdate, Encoding, MerkleTree, Mina, PrivateKey, PublicKey, Signature, UInt64 } from 'o1js'
import { Vault } from './Vault'
import { Token } from './Token'
import { Exchange, PAIRS_HEIGHT } from './Exchange'
import { Database } from './common/database'

const proofsEnabled = false

describe('token vault test', () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled })
    Mina.setActiveInstance(Local)

    const database = new Database()

    const czPrivkey = Local.testAccounts[0].privateKey
    const czPubkey = Local.testAccounts[0].publicKey

    const satoshiPrivkey = Local.testAccounts[1].privateKey
    const satoshiPubkey = Local.testAccounts[1].publicKey

    const fedPrivkey = Local.testAccounts[2].privateKey
    const fedPubkey = Local.testAccounts[2].publicKey

    const exchangePrivkey = PrivateKey.random()
    const exchangePubkey = exchangePrivkey.toPublicKey()
    const exchangeZkapp = new Exchange(exchangePubkey)

    const btcTokenPrivkey = PrivateKey.random()
    const btcTokenPubkey = btcTokenPrivkey.toPublicKey()
    const btcTokenZkapp = new Token(btcTokenPubkey)

    const usdTokenPrivkey = PrivateKey.random()
    const usdTokenPubkey = usdTokenPrivkey.toPublicKey()
    const usdTokenZkapp = new Token(usdTokenPubkey)

    const btcVaultZkapp = new Vault(exchangePubkey, btcTokenZkapp.token.id)
    const usdVaultZkapp = new Vault(exchangePubkey, usdTokenZkapp.token.id)

    const BTC_SYMBOL = Encoding.stringToFields('BTC')[0]
    const BTC_DECIMALS = UInt64.from(6)
    const BTC_MAX_SUPPLY = UInt64.from(21_000_000_000_000n)
    const BTC_MINT_AMOUNT = UInt64.from(10_000_000_000_000n)

    const USD_SYMBOL = Encoding.stringToFields('USD')[0]
    const USD_DECIMALS = UInt64.from(2)
    const USD_MAX_SUPPLY = UInt64.from(999_000_000_000_000_000n)
    const USD_MINT_AMOUNT = UInt64.from(999_000_000_000_000_000n)

    const BUY_ORDER_AMOUNT = UInt64.from(1_000_000n)
    const BUY_ORDER_PRICE = UInt64.from(69_000_00n)

    const SELL_ORDER_AMOUNT = UInt64.from(2_000_000n)
    const SELL_ORDER_PRICE = UInt64.from(69_500_00n)

    beforeAll(async () => {
        if (proofsEnabled) {
            await Exchange.compile()
            await Vault.compile()
            await Token.compile()
        }
    })

    it('can deploy and initialize exchange', async () => {
        const tx = await Mina.transaction(czPubkey, () => {
            AccountUpdate.fundNewAccount(czPubkey)
            exchangeZkapp.deploy()
            exchangeZkapp.initialize(czPubkey)
        })

        await tx.prove()

        tx.sign([czPrivkey, exchangePrivkey])

        await tx.send()

        exchangeZkapp.authority.getAndRequireEquals().assertEquals(czPubkey)
        exchangeZkapp.root.getAndRequireEquals().assertEquals(new MerkleTree(PAIRS_HEIGHT).getRoot())
    })

    it('can deploy and initialize BTC tokens', async () => {
        const tx = await Mina.transaction(satoshiPubkey, () => {
            AccountUpdate.fundNewAccount(satoshiPubkey)
            btcTokenZkapp.deploy()
            btcTokenZkapp.initialize(BTC_SYMBOL, BTC_DECIMALS, BTC_MAX_SUPPLY)
        })

        await tx.prove()

        tx.sign([satoshiPrivkey, btcTokenPrivkey])

        await tx.send()

        btcTokenZkapp.symbol.getAndRequireEquals().assertEquals(BTC_SYMBOL)
        btcTokenZkapp.decimals.getAndRequireEquals().assertEquals(BTC_DECIMALS)
        btcTokenZkapp.maxSupply.getAndRequireEquals().assertEquals(BTC_MAX_SUPPLY)
        btcTokenZkapp.circulatingSupply.getAndRequireEquals().assertEquals(UInt64.zero)
    })

    it('can deploy and initialize USD tokens', async () => {
        const tx = await Mina.transaction(fedPubkey, () => {
            AccountUpdate.fundNewAccount(fedPubkey)
            usdTokenZkapp.deploy()
            usdTokenZkapp.initialize(USD_SYMBOL, USD_DECIMALS, USD_MAX_SUPPLY)
        })

        await tx.prove()

        tx.sign([fedPrivkey, usdTokenPrivkey])

        await tx.send()

        usdTokenZkapp.symbol.getAndRequireEquals().assertEquals(USD_SYMBOL)
        usdTokenZkapp.decimals.getAndRequireEquals().assertEquals(USD_DECIMALS)
        usdTokenZkapp.maxSupply.getAndRequireEquals().assertEquals(USD_MAX_SUPPLY)
        usdTokenZkapp.circulatingSupply.getAndRequireEquals().assertEquals(UInt64.zero)
    })

    it('can mint BTC tokens', async () => {
        const tx = await Mina.transaction(satoshiPubkey, () => {
            AccountUpdate.fundNewAccount(satoshiPubkey)
            btcTokenZkapp.mint(satoshiPubkey, BTC_MINT_AMOUNT)
        })

        await tx.prove()

        tx.sign([satoshiPrivkey])

        await tx.send()

        Mina.getBalance(satoshiPubkey, btcTokenZkapp.token.id).assertEquals(BTC_MINT_AMOUNT)
        btcTokenZkapp.circulatingSupply.getAndRequireEquals().assertEquals(BTC_MINT_AMOUNT)
    })

    it('can mint USD tokens', async () => {
        const tx = await Mina.transaction(fedPubkey, () => {
            AccountUpdate.fundNewAccount(fedPubkey)
            usdTokenZkapp.mint(fedPubkey, USD_MINT_AMOUNT)
        })

        await tx.prove()

        tx.sign([fedPrivkey])

        await tx.send()

        Mina.getBalance(fedPubkey, usdTokenZkapp.token.id).assertEquals(USD_MINT_AMOUNT)
        usdTokenZkapp.circulatingSupply.getAndRequireEquals().assertEquals(USD_MINT_AMOUNT)
    })

    it('can deploy BTC vault', async () => {
        const tx = await Mina.transaction(satoshiPubkey, () => {
            AccountUpdate.fundNewAccount(satoshiPubkey)
            btcVaultZkapp.deploy()
            btcTokenZkapp.approveUpdate(btcVaultZkapp.self)
        })

        await tx.prove()

        tx.sign([satoshiPrivkey, exchangePrivkey])

        await tx.send()
    })

    it('can deploy USD vault', async () => {
        const tx = await Mina.transaction(fedPubkey, () => {
            AccountUpdate.fundNewAccount(fedPubkey)
            usdVaultZkapp.deploy()
            usdTokenZkapp.approveUpdate(usdVaultZkapp.self)
        })

        await tx.prove()

        tx.sign([fedPrivkey, exchangePrivkey])

        await tx.send()
    })

    it('can create BTC/USD pair', async () => {
        database.addPair({
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const pairWitness = database.getPairWitness({
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const signature = Signature.create(czPrivkey, [
            ...btcTokenPubkey.toFields(),
            ...usdTokenPubkey.toFields(),
            ...pairWitness.toFields(),
        ])

        const tx = await Mina.transaction(satoshiPubkey, () => {
            exchangeZkapp.createPair(btcTokenPubkey, usdTokenPubkey, pairWitness, signature)
        })

        await tx.prove()

        tx.sign([satoshiPrivkey])

        await tx.send()
    })

    it('can place orders', async () => {
        const pairWitness = database.getPairWitness({
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const orderIndex = database.addOrder({
            side: 'BUY',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
            amount: BUY_ORDER_AMOUNT.toBigInt(),
            price: BUY_ORDER_PRICE.toBigInt(),
            maker: fedPubkey.toBase58(),
        })

        const buyOrderWitness = database.getOrderWitness({
            side: 'BUY',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
            orderIndex,
        })

        const sellOrdersRoot = database.getOrdersRoot({
            side: 'SELL',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const signature = Signature.create(czPrivkey, [
            ...BUY_ORDER_AMOUNT.toFields(),
            ...BUY_ORDER_PRICE.toFields(),
            ...btcTokenPubkey.toFields(),
            ...usdTokenPubkey.toFields(),
            ...buyOrderWitness.toFields(),
            ...sellOrdersRoot.toFields(),
            ...pairWitness.toFields(),
        ])

        const tx = await Mina.transaction(fedPubkey, () => {
            exchangeZkapp.placeBuyOrder(
                BUY_ORDER_AMOUNT,
                BUY_ORDER_PRICE,
                btcTokenPubkey,
                usdTokenPubkey,
                buyOrderWitness,
                sellOrdersRoot,
                pairWitness,
                signature
            )
        })

        await tx.prove()

        tx.sign([fedPrivkey])

        await tx.send()

        Mina.getBalance(fedPubkey, usdTokenZkapp.token.id).assertEquals(
            USD_MINT_AMOUNT.sub(BUY_ORDER_AMOUNT.mul(BUY_ORDER_PRICE))
        )
        Mina.getBalance(exchangePubkey, usdTokenZkapp.token.id).assertEquals(BUY_ORDER_AMOUNT.mul(BUY_ORDER_PRICE))
    })

    it('can cancel orders', async () => {
        const pairWitness = database.getPairWitness({
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const buyOrderWitness = database.getOrderWitness({
            side: 'BUY',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
            orderIndex: 0,
        })

        database.removeOrder({
            side: 'BUY',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
            orderIndex: 0,
        })

        const sellOrdersRoot = database.getOrdersRoot({
            side: 'SELL',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const signature = Signature.create(czPrivkey, [
            ...BUY_ORDER_AMOUNT.toFields(),
            ...BUY_ORDER_PRICE.toFields(),
            ...btcTokenPubkey.toFields(),
            ...usdTokenPubkey.toFields(),
            ...buyOrderWitness.toFields(),
            ...sellOrdersRoot.toFields(),
            ...pairWitness.toFields(),
        ])

        const tx = await Mina.transaction(fedPubkey, () => {
            exchangeZkapp.cancelBuyOrder(
                BUY_ORDER_AMOUNT,
                BUY_ORDER_PRICE,
                btcTokenPubkey,
                usdTokenPubkey,
                buyOrderWitness,
                sellOrdersRoot,
                pairWitness,
                signature
            )
        })

        await tx.prove()

        tx.sign([fedPrivkey])

        await tx.send()

        Mina.getBalance(fedPubkey, usdTokenZkapp.token.id).assertEquals(USD_MINT_AMOUNT)
        Mina.getBalance(exchangePubkey, usdTokenZkapp.token.id).assertEquals(UInt64.zero)
    })

    it('can place orders', async () => {
        const pairWitness = database.getPairWitness({
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const orderIndex = database.addOrder({
            side: 'SELL',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
            amount: SELL_ORDER_AMOUNT.toBigInt(),
            price: SELL_ORDER_PRICE.toBigInt(),
            maker: satoshiPubkey.toBase58(),
        })

        const buyOrdersRoot = database.getOrdersRoot({
            side: 'BUY',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const sellOrderWitness = database.getOrderWitness({
            side: 'SELL',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
            orderIndex,
        })

        const signature = Signature.create(czPrivkey, [
            ...SELL_ORDER_AMOUNT.toFields(),
            ...SELL_ORDER_PRICE.toFields(),
            ...btcTokenPubkey.toFields(),
            ...usdTokenPubkey.toFields(),
            ...buyOrdersRoot.toFields(),
            ...sellOrderWitness.toFields(),
            ...pairWitness.toFields(),
        ])

        const tx1 = await Mina.transaction(satoshiPubkey, () => {
            AccountUpdate.fundNewAccount(satoshiPubkey)
            const update = AccountUpdate.createSigned(satoshiPubkey, usdTokenZkapp.token.id)
            usdTokenZkapp.approveUpdate(update)
        })

        await tx1.prove()

        tx1.sign([satoshiPrivkey])

        await tx1.send()

        const tx2 = await Mina.transaction(satoshiPubkey, () => {
            exchangeZkapp.placeSellOrder(
                SELL_ORDER_AMOUNT,
                SELL_ORDER_PRICE,
                btcTokenPubkey,
                usdTokenPubkey,
                buyOrdersRoot,
                sellOrderWitness,
                pairWitness,
                signature
            )
        })

        await tx2.prove()

        tx2.sign([satoshiPrivkey])

        await tx2.send()

        Mina.getBalance(satoshiPubkey, btcTokenZkapp.token.id).assertEquals(BTC_MINT_AMOUNT.sub(SELL_ORDER_AMOUNT))
        Mina.getBalance(exchangePubkey, btcTokenZkapp.token.id).assertEquals(SELL_ORDER_AMOUNT)
    })

    it('can execute orders', async () => {
        const pairWitness = database.getPairWitness({
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const orderToExecute = database.getOrder({
            side: 'SELL',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
            orderIndex: 0,
        })

        const buyOrdersRoot = database.getOrdersRoot({
            side: 'BUY',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
        })

        const sellOrderWitness = database.getOrderWitness({
            side: 'SELL',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
            orderIndex: 0,
        })

        database.removeOrder({
            side: 'SELL',
            baseCurrency: btcTokenPubkey.toBase58(),
            quoteCurrency: usdTokenPubkey.toBase58(),
            orderIndex: 0,
        })

        const maker = PublicKey.fromBase58(orderToExecute.maker)
        const amount = UInt64.from(orderToExecute.amount)
        const price = UInt64.from(orderToExecute.price)

        const signature = Signature.create(czPrivkey, [
            ...maker.toFields(),
            ...amount.toFields(),
            ...price.toFields(),
            ...btcTokenPubkey.toFields(),
            ...usdTokenPubkey.toFields(),
            ...buyOrdersRoot.toFields(),
            ...sellOrderWitness.toFields(),
            ...pairWitness.toFields(),
        ])

        const tx1 = await Mina.transaction(fedPubkey, () => {
            AccountUpdate.fundNewAccount(fedPubkey)
            const update = AccountUpdate.createSigned(fedPubkey, btcTokenZkapp.token.id)
            btcTokenZkapp.approveUpdate(update)
        })

        await tx1.prove()

        tx1.sign([fedPrivkey])

        await tx1.send()

        const tx2 = await Mina.transaction(fedPubkey, () => {
            exchangeZkapp.executeSellOrder(
                maker,
                amount,
                price,
                btcTokenPubkey,
                usdTokenPubkey,
                buyOrdersRoot,
                sellOrderWitness,
                pairWitness,
                signature
            )
        })

        await tx2.prove()

        tx2.sign([fedPrivkey])

        await tx2.send()

        console.log(tx2.transaction.accountUpdates.length)

        Mina.getBalance(satoshiPubkey, btcTokenZkapp.token.id).assertEquals(BTC_MINT_AMOUNT.sub(SELL_ORDER_AMOUNT))
        Mina.getBalance(exchangePubkey, btcTokenZkapp.token.id).assertEquals(UInt64.zero)
        Mina.getBalance(fedPubkey, btcTokenZkapp.token.id).assertEquals(SELL_ORDER_AMOUNT)

        Mina.getBalance(satoshiPubkey, usdTokenZkapp.token.id).assertEquals(SELL_ORDER_AMOUNT.mul(SELL_ORDER_PRICE))
        Mina.getBalance(exchangePubkey, usdTokenZkapp.token.id).assertEquals(UInt64.zero)
        Mina.getBalance(fedPubkey, usdTokenZkapp.token.id).assertEquals(
            USD_MINT_AMOUNT.sub(SELL_ORDER_AMOUNT.mul(SELL_ORDER_PRICE))
        )
    })
})
