package expo.modules.banksms

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BankSmsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BankSms")

    Events("onBankSmsReceived")

    OnStartObserving {
      BankSmsEventEmitter.listener = { text ->
        sendEvent("onBankSmsReceived", mapOf("text" to text))
      }
    }

    OnStopObserving {
      BankSmsEventEmitter.listener = null
    }
  }
}
