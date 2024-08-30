import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  internal as internal_relaxed,
  MessageRelaxed,
  OutAction,
  OutActionSendMsg,
  Sender,
  SendMode,
  storeMessageRelaxed,
  storeOutList,
  toNano,
} from '@ton/core';

import { sign } from '@ton/crypto';
import { HighloadQueryId } from './HighloadQueryId';

export type HighloadWalletV3LiteConfig = {
  publicKey: Buffer;
  subwalletId: number;
  timeout: number;
};

export const HWV3_SUBWALLET_ID = 239;

export const HWV3_DEFAULT_TIMEOUT = 128;

export enum HWV3OP {
  InternalTransfer = 0xae42e5a4,
}
export abstract class HWV3Errors {
  static invalid_signature = 33;
  static invalid_subwallet = 34;
  static invalid_creation_time = 35;
  static already_executed = 36;
}

export const maxKeyCount = 1 << 13; //That is max key count not max key value
export const maxShift = maxKeyCount - 1;
export const maxQueryCount = maxKeyCount * 1023; // Therefore value count
export const maxQueryId = (maxShift << 10) + 1022;

export const TIMESTAMP_SIZE = 64;
export const TIMEOUT_SIZE = 22;

export function highloadWalletV3LiteConfigToCell(config: HighloadWalletV3LiteConfig): Cell {
  return beginCell()
    .storeBuffer(config.publicKey)
    .storeUint(config.subwalletId, 32)
    .storeUint(0, 1 + 1 + TIMESTAMP_SIZE)
    .storeUint(config.timeout, TIMEOUT_SIZE)
    .endCell();
}

export class HighloadWalletV3Lite implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new HighloadWalletV3Lite(address);
  }

  static createFromConfig(config: HighloadWalletV3LiteConfig, code: Cell, workchain = 0) {
    const data = highloadWalletV3LiteConfigToCell(config);
    const init = { code, data };
    return new HighloadWalletV3Lite(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      bounce: false,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: Cell.EMPTY,
    });
  }

  static packExternalMessage(
    secretKey: Buffer,
    msgActions: OutActionSendMsg[],
    opts: {
      query_id: bigint | HighloadQueryId;
      createdAt: number;
      subwalletId: number;
    },
  ) {
    const queryId = opts.query_id instanceof HighloadQueryId ? opts.query_id.getQueryId() : opts.query_id;

    const messageInner = beginCell()
      .storeUint(opts.subwalletId, 32)
      .storeRef(HighloadWalletV3Lite.packActions(msgActions))
      .storeUint(queryId, 23)
      .storeUint(opts.createdAt, TIMESTAMP_SIZE)
      .endCell();

    return beginCell().storeBuffer(sign(messageInner.hash(), secretKey)).storeRef(messageInner).endCell();
  }

  async sendExternalMessage(
    provider: ContractProvider,
    secretKey: Buffer,
    msgActions: OutActionSendMsg[],
    opts: {
      query_id: bigint | HighloadQueryId;
      createdAt: number;
      subwalletId: number;
    },
  ) {
    return provider.external(HighloadWalletV3Lite.packExternalMessage(secretKey, msgActions, opts));
  }

  async sendBatch(
    provider: ContractProvider,
    secretKey: Buffer,
    messages: OutActionSendMsg[],
    subwallet: number,
    query_id: HighloadQueryId,
    createdAt?: number,
  ) {
    if (createdAt == undefined) {
      createdAt = Math.floor(Date.now() / 1000);
    }
    return await this.sendExternalMessage(provider, secretKey, messages, {
      query_id: query_id,
      createdAt: createdAt,
      subwalletId: subwallet,
    });
  }

  static packActions(actions: OutAction[]) {
    if (actions.length > 254) {
      // TODO: pack more messages here (via recursion)
      throw TypeError('Max allowed action count is 254.');
    }

    return beginCell().store(storeOutList(actions)).endCell();
  }

  async getPublicKey(provider: ContractProvider): Promise<Buffer> {
    const res = (await provider.get('get_public_key', [])).stack;
    const pubKeyU = res.readBigNumber();
    return Buffer.from(pubKeyU.toString(16).padStart(32 * 2, '0'), 'hex');
  }

  async getSubwalletId(provider: ContractProvider): Promise<number> {
    const res = (await provider.get('get_subwallet_id', [])).stack;
    return res.readNumber();
  }

  async getTimeout(provider: ContractProvider): Promise<number> {
    const res = (await provider.get('get_timeout', [])).stack;
    return res.readNumber();
  }

  async getLastCleaned(provider: ContractProvider): Promise<number> {
    const res = (await provider.get('get_last_clean_time', [])).stack;
    return res.readNumber();
  }

  async getProcessed(provider: ContractProvider, queryId: HighloadQueryId, needClean = true): Promise<boolean> {
    const res = (
      await provider.get('processed?', [
        { type: 'int', value: queryId.getQueryId() },
        {
          type: 'int',
          value: needClean ? -1n : 0n,
        },
      ])
    ).stack;
    return res.readBoolean();
  }
}
