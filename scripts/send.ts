import { Address, internal, SendMode, toNano } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { NetworkProvider } from '@ton/blueprint';

import { HighloadWalletV3Lite } from '../wrappers/HighloadWalletV3Lite';
import { messageRelaxedToOutAction } from '../utils';

export async function run(provider: NetworkProvider) {
  const highloadWalletV3Lite = provider.open(
    HighloadWalletV3Lite.createFromAddress(Address.parse('UQDRM25xui6S1Tv-bIlpgYQVGCMmnLuZnv38I5HEgRFqpLLs')),
  );

  const msgActions = [internal({ to: highloadWalletV3Lite.address, value: toNano('0') })].map((m) =>
    messageRelaxedToOutAction(m, SendMode.CARRY_ALL_REMAINING_BALANCE),
  );

  const keyPair = await mnemonicToPrivateKey(process.env.HW_MNEMONIC!.split(' '));

  await highloadWalletV3Lite.sendExternalMessage(keyPair.secretKey, msgActions, 190n);
}
