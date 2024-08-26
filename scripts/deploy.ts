import { compile, NetworkProvider } from '@ton/blueprint';
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';

import { toNano } from '@ton/core';
import { HighloadWalletV3, HWV3_DEFAULT_TIMEOUT, HWV3_SUBWALLET_ID } from '../wrappers/HighloadWalletV3';

export async function run(provider: NetworkProvider) {
  const code = await compile('HighloadWalletV3');
  const mnemonic = await mnemonicNew();
  console.log('mnemonic\n' + mnemonic.join(' '));
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const highloadWalletV3 = provider.open(
    HighloadWalletV3.createFromConfig(
      {
        publicKey: keyPair.publicKey,
        subwalletId: HWV3_SUBWALLET_ID,
        timeout: HWV3_DEFAULT_TIMEOUT,
      },
      code,
    ),
  );

  await highloadWalletV3.sendDeploy(provider.sender(), toNano('1.5'));

  await provider.waitForDeploy(highloadWalletV3.address);
}
