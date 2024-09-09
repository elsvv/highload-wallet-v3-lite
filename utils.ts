import { MessageRelaxed, OutActionSendMsg, SendMode } from '@ton/core';

const getRandom = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

export const getRandomInt = (min: number, max: number) => {
  return Math.round(getRandom(min, max));
};

export function messageRelaxedToOutAction(
  outMsg: MessageRelaxed,
  mode: SendMode = SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
): OutActionSendMsg {
  return {
    type: 'sendMsg',
    mode,
    outMsg,
  };
}
