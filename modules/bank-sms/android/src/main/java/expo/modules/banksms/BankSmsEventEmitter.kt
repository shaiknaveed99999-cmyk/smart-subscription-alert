package expo.modules.banksms

object BankSmsEventEmitter {
  var listener: ((String) -> Unit)? = null
}
