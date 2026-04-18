import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:telephony/telephony.dart';

const MethodChannel _smsChannel = MethodChannel('com.digibiz.smsgateway/sms');

/// Outcome of the layered SMS pipeline (Telephony first, native SmsManager fallback).
class UniversalSmsOutcome {
  UniversalSmsOutcome({
    required this.success,
    required this.summaryForUi,
    required this.fullTrace,
  });

  final bool success;
  final String summaryForUi;
  final String fullTrace;
}

Future<Map<String, dynamic>> fetchAndroidDeviceInfo() async {
  if (defaultTargetPlatform != TargetPlatform.android) {
    return <String, dynamic>{};
  }
  try {
    final Map<String, dynamic>? m = await _smsChannel.invokeMapMethod<String, dynamic>('getDeviceInfo');
    if (m != null) return m;
  } catch (_) {}
  return <String, dynamic>{};
}

Future<UniversalSmsOutcome> sendSmsUniversal({
  required String phone,
  required String body,
  Duration telephonyTimeout = const Duration(seconds: 25),
}) async {
  final trace = StringBuffer();

  String telephonyLine = '';
  try {
    await Telephony.instance
        .sendSms(to: phone, message: body)
        .timeout(telephonyTimeout);
    telephonyLine = 'Telephony plugin: OK';
    trace.writeln(telephonyLine);
    return UniversalSmsOutcome(
      success: true,
      summaryForUi: 'Sent via Telephony plugin',
      fullTrace: trace.toString(),
    );
  } catch (e) {
    telephonyLine = 'Telephony plugin: ${_classifyTelephony(e)} — $e';
    trace.writeln(telephonyLine);
  }

  try {
    final Map<String, dynamic> map = await _smsChannel.invokeMapMethod<String, dynamic>(
          'sendSmsNative',
          <String, String>{'phone': phone, 'body': body},
        ) ??
        <String, dynamic>{};
    final bool ok = map['ok'] == true;
    final String category = map['category']?.toString() ?? 'unknown';
    final String detail = map['detail']?.toString() ?? '';
    final String nativeLine = 'Native SmsManager [$category]: $detail';
    trace.writeln(nativeLine);

    if (ok) {
      return UniversalSmsOutcome(
        success: true,
        summaryForUi: 'Sent via native Android SmsManager (Telephony path failed; fallback succeeded)',
        fullTrace: trace.toString(),
      );
    }

    return UniversalSmsOutcome(
      success: false,
      summaryForUi: _userFacingFailureSummary(category, detail),
      fullTrace: trace.toString(),
    );
  } catch (e) {
    final String nativeLine = 'Native MethodChannel: ${e.runtimeType} — $e';
    trace.writeln(nativeLine);
    return UniversalSmsOutcome(
      success: false,
      summaryForUi:
          'Native SMS bridge failed (${e.runtimeType}). Often a MissingPluginException means a full rebuild/reinstall is required.',
      fullTrace: trace.toString(),
    );
  }
}

String _classifyTelephony(Object e) {
  if (e is PlatformException) {
    return 'PlatformException(${e.code})';
  }
  if (e is TimeoutException) {
    return 'timeout';
  }
  if (e is MissingPluginException) {
    return 'MissingPluginException';
  }
  return e.runtimeType.toString();
}

String _userFacingFailureSummary(String category, String detail) {
  switch (category) {
    case 'permission_denied':
      return 'Permission: SEND_SMS denied at native check. Open Settings → Apps → DigiBiz SMS → Permissions → SMS.';
    case 'security_exception':
      return 'Android SecurityException blocked SmsManager.sendTextMessage. On EMUI: disable aggressive battery limits for this app and keep the gateway screen open.';
    case 'no_service':
      return 'Radio: no cellular service (RESULT_ERROR_NO_SERVICE).';
    case 'radio_off':
      return 'Radio off or airplane mode (RESULT_ERROR_RADIO_OFF).';
    case 'carrier_generic_failure':
      return 'Carrier / EMUI rejected the PDU (RESULT_ERROR_GENERIC_FAILURE). Try setting this app as the default SMS app, check dual-SIM default data/SMS SIM, or OEM “pure mode” / permission restrictions. Detail: $detail';
    case 'null_pdu':
      return 'Null PDU (routing/SIM/SMSC). Check SIM card and SMS center settings. Detail: $detail';
    case 'radio_timeout':
      return 'Radio never confirmed delivery to SmsManager (timeout). EMUI often blocks or delays SENT intents when the app is not foreground — keep this screen visible and unlocked.';
    case 'limit_exceeded':
      return 'SMS sending rate limit exceeded. Wait and retry.';
    case 'invalid_number':
      return 'Invalid destination number.';
    case 'receiver_registration_failed':
      return 'Could not register SMS SENT receiver: $detail';
    case 'sms_manager_exception':
      return 'SmsManager threw before queuing to radio: $detail';
    default:
      return 'SMS failed ($category): $detail';
  }
}
