import { EventEmitter, requireNativeModule } from 'expo-modules-core';

const BankSmsModule = requireNativeModule('BankSms');
const emitter = new EventEmitter(BankSmsModule);

export function addBankSmsListener(
  listener: (event: { text: string }) => void,
) {
  return emitter.addListener('onBankSmsReceived', listener);
}
