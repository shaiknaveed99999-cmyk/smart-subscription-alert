package expo.modules.banksms

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.facebook.react.HeadlessJsTaskService

class BankSmsNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val text =
      sbn.notification.extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()

    if (
      text == null ||
      !(text.contains("Rs", ignoreCase = true) || text.contains("INR", ignoreCase = true))
    ) {
      return
    }

    BankSmsEventEmitter.listener?.invoke(text)

    val intent = Intent(applicationContext, BankSmsHeadlessTaskService::class.java)
    intent.putExtra("text", text)
    HeadlessJsTaskService.acquireWakeLockNow(applicationContext)
    applicationContext.startService(intent)
  }
}
