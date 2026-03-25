package com.brucelink

import android.view.View
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Hides the 3-button navigation bar while Navigator is open (immersive sticky).
 * User can swipe from the edge to show bars temporarily — same pattern as many games / media apps.
 */
class SystemUiModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BruceSystemUi"

  @ReactMethod
  fun setImmersiveNavigation(enabled: Boolean) {
    val activity = reactContext.currentActivity ?: return
    activity.runOnUiThread {
      val window = activity.window
      val decor = window.decorView
      if (enabled) {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, decor)
        controller.hide(WindowInsetsCompat.Type.navigationBars())
        controller.systemBarsBehavior =
          WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      } else {
        val controller = WindowInsetsControllerCompat(window, decor)
        controller.show(WindowInsetsCompat.Type.navigationBars())
        WindowCompat.setDecorFitsSystemWindows(window, true)
        @Suppress("DEPRECATION")
        decor.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
      }
    }
  }
}
