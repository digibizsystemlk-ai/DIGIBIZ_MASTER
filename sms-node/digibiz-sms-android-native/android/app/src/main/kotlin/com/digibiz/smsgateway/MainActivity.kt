package com.digibiz.smsgateway

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.ArrayList
import java.util.concurrent.atomic.AtomicBoolean

class MainActivity : FlutterActivity() {

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getDeviceInfo" -> {
                    result.success(
                        mapOf(
                            "manufacturer" to Build.MANUFACTURER,
                            "model" to Build.MODEL,
                            "brand" to Build.BRAND,
                            "sdkInt" to Build.VERSION.SDK_INT,
                            "release" to Build.VERSION.RELEASE,
                        ),
                    )
                }

                "sendSmsNative" -> {
                    val phone = call.argument<String>("phone")?.trim().orEmpty()
                    val body = call.argument<String>("body").orEmpty()
                    if (phone.isEmpty()) {
                        result.success(
                            failureMap(
                                "invalid_number",
                                "Phone number is empty",
                            ),
                        )
                        return@setMethodCallHandler
                    }
                    if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.SEND_SMS)
                        != PackageManager.PERMISSION_GRANTED
                    ) {
                        result.success(
                            failureMap(
                                "permission_denied",
                                "SEND_SMS is not granted (checked in native MainActivity).",
                            ),
                        )
                        return@setMethodCallHandler
                    }
                    sendWithSmsManager(phone, body, result)
                }

                else -> result.notImplemented()
            }
        }
    }

    private fun failureMap(category: String, detail: String): Map<String, Any?> = mapOf(
        "ok" to false,
        "category" to category,
        "detail" to detail,
        "path" to "native_sms_manager",
    )

    private fun successMap(detail: String): Map<String, Any?> = mapOf(
        "ok" to true,
        "category" to "success",
        "detail" to detail,
        "path" to "native_sms_manager",
    )

    @Suppress("DEPRECATION")
    private fun obtainSmsManager(): SmsManager {
        // API 31+: prefer framework SmsManager service when present.
        if (Build.VERSION.SDK_INT >= 31) {
            getSystemService(SmsManager::class.java)?.let { return it }
        }
        // API 29+: static getDefaultSmsSubscriptionId() (do not use instance defaultSmsSubscriptionId — not on API 26 / not in all stubs).
        if (Build.VERSION.SDK_INT >= 29) {
            try {
                val smsSub = SubscriptionManager.getDefaultSmsSubscriptionId()
                if (smsSub != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
                    return SmsManager.getSmsManagerForSubscriptionId(smsSub)
                }
            } catch (_: Exception) {
            }
        }
        // API 24–28 (includes Android 8 / Nova 2i): default data/voice subscription; safe fallback before getDefault().
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                val sub = SubscriptionManager.getDefaultSubscriptionId()
                if (sub != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
                    return SmsManager.getSmsManagerForSubscriptionId(sub)
                }
            } catch (_: Exception) {
            }
        }
        return SmsManager.getDefault()
    }

    private fun sendWithSmsManager(phone: String, body: String, result: MethodChannel.Result) {
        val resultHandled = AtomicBoolean(false)
        val handler = Handler(Looper.getMainLooper())

        fun reply(map: Map<String, Any?>) {
            handler.post {
                if (resultHandled.compareAndSet(false, true)) {
                    result.success(map)
                }
            }
        }

        lateinit var timeoutRunnable: Runnable
        val smsManager = obtainSmsManager()
        val parts = smsManager.divideMessage(body)
        val action = "com.digibiz.smsgateway.SMS_SENT_${System.nanoTime()}"
        val sentIntent = Intent(action).setPackage(packageName)

        val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            @Suppress("DEPRECATION")
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val requestCode = (System.nanoTime() and 0x7FFF_FFFF).toInt()
        val sentPI = PendingIntent.getBroadcast(this, requestCode, sentIntent, piFlags)

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                handler.removeCallbacks(timeoutRunnable)
                try {
                    unregisterReceiverCompat(this)
                } catch (_: Exception) {
                }
                if (resultHandled.get()) return

                when (val code = getResultCode()) {
                    Activity.RESULT_OK -> {
                        reply(successMap("SmsManager SENT broadcast: RESULT_OK"))
                    }

                    SmsManager.RESULT_ERROR_GENERIC_FAILURE -> {
                        val sub = intent?.getIntExtra("errorCode", -1) ?: -1
                        reply(
                            failureMap(
                                "carrier_generic_failure",
                                "RESULT_ERROR_GENERIC_FAILURE (oemSubCode=$sub). Common on EMUI: not default SMS app, carrier block, or aggressive power saving.",
                            ),
                        )
                    }

                    SmsManager.RESULT_ERROR_RADIO_OFF -> {
                        reply(failureMap("radio_off", "RESULT_ERROR_RADIO_OFF (airplane mode / radio disabled)."))
                    }

                    SmsManager.RESULT_ERROR_NULL_PDU -> {
                        reply(failureMap("null_pdu", "RESULT_ERROR_NULL_PDU (routing / SIM / SMSC issue)."))
                    }

                    SmsManager.RESULT_ERROR_NO_SERVICE -> {
                        reply(failureMap("no_service", "RESULT_ERROR_NO_SERVICE (no cell registration)."))
                    }

                    else -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                            code == SmsManager.RESULT_ERROR_LIMIT_EXCEEDED
                        ) {
                            reply(failureMap("limit_exceeded", "RESULT_ERROR_LIMIT_EXCEEDED (rate limit)."))
                        } else {
                            reply(
                                failureMap(
                                    "unknown_radio_result",
                                    "Unexpected SENT resultCode=$code",
                                ),
                            )
                        }
                    }
                }
            }
        }

        val filter = IntentFilter(action)
        try {
            registerReceiverCompat(receiver, filter)
        } catch (e: Exception) {
            reply(
                failureMap(
                    "receiver_registration_failed",
                    e.message ?: e.toString(),
                ),
            )
            return
        }

        timeoutRunnable = Runnable {
            try {
                unregisterReceiverCompat(receiver)
            } catch (_: Exception) {
            }
            reply(
                failureMap(
                    "radio_timeout",
                    "No SENT callback within ${SMS_TIMEOUT_MS}ms — EMUI often delays or drops PendingIntent if the app is backgrounded; keep this screen open.",
                ),
            )
        }
        handler.postDelayed(timeoutRunnable, SMS_TIMEOUT_MS)

        try {
            if (parts.size <= 1) {
                smsManager.sendTextMessage(phone, null, body, sentPI, null)
            } else {
                val sentIntents = ArrayList<PendingIntent?>()
                val deliveryIntents = ArrayList<PendingIntent?>()
                for (i in parts.indices) {
                    sentIntents.add(if (i == parts.lastIndex) sentPI else null)
                    deliveryIntents.add(null)
                }
                smsManager.sendMultipartTextMessage(phone, null, parts, sentIntents, deliveryIntents)
            }
        } catch (se: SecurityException) {
            handler.removeCallbacks(timeoutRunnable)
            try {
                unregisterReceiverCompat(receiver)
            } catch (_: Exception) {
            }
            reply(
                failureMap(
                    "security_exception",
                    se.message ?: se.toString(),
                ),
            )
        } catch (e: Exception) {
            handler.removeCallbacks(timeoutRunnable)
            try {
                unregisterReceiverCompat(receiver)
            } catch (_: Exception) {
            }
            reply(
                failureMap(
                    "sms_manager_exception",
                    e.message ?: e.toString(),
                ),
            )
        }
    }

    private fun registerReceiverCompat(receiver: BroadcastReceiver, filter: IntentFilter) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(receiver, filter)
        }
    }

    private fun unregisterReceiverCompat(receiver: BroadcastReceiver) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            unregisterReceiver(receiver)
        } else {
            @Suppress("DEPRECATION")
            unregisterReceiver(receiver)
        }
    }

    companion object {
        private const val CHANNEL = "com.digibiz.smsgateway/sms"
        private const val SMS_TIMEOUT_MS = 90_000L
    }
}
