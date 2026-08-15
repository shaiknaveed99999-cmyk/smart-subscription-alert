package expo.modules.banksms

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class BankSmsHeadlessTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null

    return HeadlessJsTaskConfig(
      "BankSmsBackground",
      Arguments.fromBundle(extras),
      10000,
      true,
    )
  }
}
