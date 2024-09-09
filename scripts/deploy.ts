import { toNano } from '@ton/core';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { compile, NetworkProvider } from '@ton/blueprint';

import { HighloadWalletV3Lite, HWV3_DEFAULT_TIMEOUT } from '../wrappers/HighloadWalletV3Lite';

export async function run(provider: NetworkProvider) {
  const code = await compile('HighloadWalletV3Lite');
  const mnemonic = await mnemonicNew();
  console.log('mnemonic\n' + mnemonic.join(' '));
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const highloadWalletV3Lite = provider.open(
    HighloadWalletV3Lite.createFromConfig(
      {
        publicKey: keyPair.publicKey,
        timeout: HWV3_DEFAULT_TIMEOUT,
      },
      code,
    ),
  );

  await highloadWalletV3Lite.sendDeploy(provider.sender(), toNano('1'));

  await provider.waitForDeploy(highloadWalletV3Lite.address);
}
