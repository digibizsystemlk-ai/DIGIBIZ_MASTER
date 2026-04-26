import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import 'sms_universal.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase Initialization Error: $e');
  }
  runApp(const SmsGatewayApp());
}

class SmsGatewayApp extends StatelessWidget {
  const SmsGatewayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DigiBiz SMS Gateway',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  bool _loading = false;
  String _error = '';
  String? _businessId;

  @override
  void initState() {
    super.initState();
    _resolveCurrent();
  }

  Future<void> _resolveCurrent() async {
    final User? u = FirebaseAuth.instance.currentUser;
    if (u == null) return;
    await _resolveBusinessId(u);
  }

  Future<void> _resolveBusinessId(User u) async {
    try {
      final DocumentSnapshot<Map<String, dynamic>> userDoc =
          await FirebaseFirestore.instance.collection('users').doc(u.uid).get();
      final String bid = (userDoc.data()?['businessId']?.toString().trim().isNotEmpty ?? false)
          ? userDoc.data()!['businessId'].toString()
          : u.uid;
      if (mounted) setState(() => _businessId = bid);
    } catch (_) {
      if (mounted) setState(() => _businessId = u.uid);
    }
  }

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final UserCredential cred = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
      if (cred.user != null) {
        await _resolveBusinessId(cred.user!);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_businessId != null && FirebaseAuth.instance.currentUser != null) {
      return SmsGatewayPage(businessId: _businessId!);
    }
    return Scaffold(
      appBar: AppBar(title: const Text('DigiBiz SMS Gateway Login')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: <Widget>[
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
            const SizedBox(height: 12),
            TextField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password')),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loading ? null : _login,
              child: Text(_loading ? 'Logging in...' : 'Login'),
            ),
            if (_error.isNotEmpty) Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(_error, style: const TextStyle(color: Colors.redAccent)),
            ),
          ],
        ),
      ),
    );
  }
}

class SmsTask {
  final String id;
  final String phone;
  final String message;
  final String status;

  const SmsTask({
    required this.id,
    required this.phone,
    required this.message,
    required this.status,
  });

  SmsTask copyWith({String? status}) {
    return SmsTask(
      id: id,
      phone: phone,
      message: message,
      status: status ?? this.status,
    );
  }
}

class SmsGatewayPage extends StatefulWidget {
  const SmsGatewayPage({required this.businessId, super.key});
  final String businessId;

  @override
  State<SmsGatewayPage> createState() => _SmsGatewayPageState();
}

class _SmsGatewayPageState extends State<SmsGatewayPage> with WidgetsBindingObserver {
  FirebaseDatabase? db;
  DatabaseReference? queueRef;

  StreamSubscription<DatabaseEvent>? queueSub;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? firestorePendingSub;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? businessSub;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? settingsSub;
  final Set<String> inflight = <String>{};
  List<SmsTask> tasks = <SmsTask>[];
  String connectionStatus = 'Initializing service...';
  bool smsPermissionGranted = false;
  bool serviceEnabled = true;
  String deviceInfoLine = '';
  String lastSmsDiagnostics = '';
  String businessName = '-';
  String smsHeader = 'DIGIBIZ';
  int smsBalance = 0;
  int _telephonyTimeoutSeconds = 25;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    initGateway();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted) return;
    if (state == AppLifecycleState.paused && serviceEnabled) {
      setState(() {
        connectionStatus = 'Gateway live in background mode';
      });
    } else if (state == AppLifecycleState.resumed && serviceEnabled) {
      setState(() {
        connectionStatus = 'Gateway live - monitoring business queue';
      });
    }
  }

  Future<void> initGateway() async {
    try {
      _bindBusinessStreams();
      final Map<String, dynamic> dev = await fetchAndroidDeviceInfo();
      if (dev.isNotEmpty && mounted) {
        final String mfg = dev['manufacturer']?.toString() ?? '';
        final String brand = dev['brand']?.toString() ?? '';
        final String model = dev['model']?.toString() ?? '';
        final String rel = dev['release']?.toString() ?? '';
        final int sdk = (dev['sdkInt'] is int) ? dev['sdkInt'] as int : int.tryParse('${dev['sdkInt']}') ?? 0;
        final String mLow = mfg.toLowerCase();
        final String bLow = brand.toLowerCase();
        if (mLow.contains('huawei') ||
            mLow.contains('honor') ||
            bLow.contains('huawei') ||
            bLow.contains('honor')) {
          _telephonyTimeoutSeconds = 8;
        }
        setState(() {
          deviceInfoLine = 'Device: $mfg $model — Android $rel (API $sdk)';
        });
      }

      db = FirebaseDatabase.instanceFor(
        app: Firebase.app(),
        databaseURL: 'https://digibiz-sys-default-rtdb.firebaseio.com/',
      );
      queueRef = db!.ref('sms_gateway/${widget.businessId}/pending_sms');

      // Sequential requests behave better on some EMUI builds than a single batch.
      final PermissionStatus smsSt = await Permission.sms.request();
      final PermissionStatus phoneSt = await Permission.phone.request();

      final bool smsOk = smsSt.isGranted;
      final bool phoneOk = phoneSt.isGranted;

      if (mounted) {
        setState(() {
          smsPermissionGranted = smsOk;
          if (!smsOk) {
            connectionStatus = 'SMS permission denied (${smsSt.name}). Open app settings to enable SEND_SMS.';
          } else if (!phoneOk) {
            connectionStatus =
                'Connected — phone permission ${phoneSt.name} (READ_PHONE_STATE). Some OEMs need this for radio; SMS send will still be attempted.';
          } else {
            connectionStatus = 'Connected';
          }
        });
      }

      if (!smsOk) return;

      await _startService();
    } catch (e) {
      if (mounted) setState(() => connectionStatus = 'Gateway init error: $e');
    }
  }

  void _bindBusinessStreams() {
    businessSub = FirebaseFirestore.instance
        .collection('businesses')
        .doc(widget.businessId)
        .snapshots()
        .listen((DocumentSnapshot<Map<String, dynamic>> snap) {
      final Map<String, dynamic> data = snap.data() ?? <String, dynamic>{};
      final String name = data['name']?.toString().trim() ?? '';
      if (mounted) {
        setState(() {
          businessName = name.isEmpty ? widget.businessId : name;
        });
      }
    });

    settingsSub = FirebaseFirestore.instance
        .collection('settings')
        .doc(widget.businessId)
        .snapshots()
        .listen((DocumentSnapshot<Map<String, dynamic>> snap) {
      final Map<String, dynamic> data = snap.data() ?? <String, dynamic>{};
      final String hdrRaw = data['smsHeader']?.toString().trim() ?? '';
      final int bal = int.tryParse('${(data['smsWallet'] as Map?)?['smsBalance'] ?? 0}') ?? 0;
      final String normalized = hdrRaw.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase();
      if (mounted) {
        setState(() {
          smsHeader = normalized.isEmpty ? 'DIGIBIZ' : normalized.substring(0, normalized.length > 8 ? 8 : normalized.length);
          smsBalance = bal;
        });
      }
    });
  }

  Future<void> _startService() async {
    if (queueRef == null || !smsPermissionGranted) return;
    await queueSub?.cancel();
    await firestorePendingSub?.cancel();
    await fetchAndProcessOnce();
    queueSub = queueRef!.onValue.listen(
      (DatabaseEvent event) {
        if (!serviceEnabled) return;
        syncTasksFromSnapshot(event.snapshot);
        processPendingFromSnapshot(event.snapshot);
        if (mounted) {
          setState(() {
            if (!connectionStatus.startsWith('Last SMS failed')) {
              connectionStatus = 'Gateway live - monitoring business queue';
            }
          });
        }
      },
      onError: (Object error) {
        if (mounted) setState(() => connectionStatus = 'Firebase stream error: $error');
      },
    );
    firestorePendingSub = FirebaseFirestore.instance
        .collection('pending_sms')
        .where('businessId', isEqualTo: widget.businessId)
        .where('status', isEqualTo: 'pending')
        .orderBy('createdAt', descending: false)
        .limit(120)
        .snapshots()
        .listen((QuerySnapshot<Map<String, dynamic>> snap) {
      if (!serviceEnabled) return;
      for (final QueryDocumentSnapshot<Map<String, dynamic>> d in snap.docs) {
        final SmsTask? task = parseTaskFromFirestoreDoc(d);
        if (task != null) {
          unawaited(sendOne(task));
        }
      }
      if (mounted) {
        setState(() {
          if (!connectionStatus.startsWith('Last SMS failed')) {
            connectionStatus = 'Gateway live - RTDB + Firestore queue monitoring';
          }
        });
      }
    }, onError: (Object error) {
      if (mounted) {
        setState(() {
          connectionStatus = 'Firestore pending listener error: $error';
        });
      }
    });
    if (mounted) {
      setState(() {
        serviceEnabled = true;
        connectionStatus = 'Gateway live - RTDB + Firestore queue monitoring';
      });
    }
  }

  Future<void> _stopService() async {
    await queueSub?.cancel();
    await firestorePendingSub?.cancel();
    queueSub = null;
    firestorePendingSub = null;
    if (mounted) {
      setState(() {
        serviceEnabled = false;
        connectionStatus = 'Service stopped by user';
      });
    }
  }

  Future<void> fetchAndProcessOnce() async {
    if (queueRef == null) return;
    try {
      final DataSnapshot snap = await queueRef!.get();
      syncTasksFromSnapshot(snap);
      await processPendingFromSnapshot(snap);
    } catch (_) {}
  }

  void syncTasksFromSnapshot(DataSnapshot snapshot) {
    final List<SmsTask> next = <SmsTask>[];
    if (!snapshot.exists || snapshot.value == null) {
      if (mounted) setState(() => tasks = <SmsTask>[]);
      return;
    }
    final dynamic raw = snapshot.value;
    if (raw is Map) {
      raw.forEach((dynamic key, dynamic value) {
        final SmsTask? task = parseTask(key.toString(), value);
        if (task != null) next.add(task);
      });
    }
    next.sort((SmsTask a, SmsTask b) => a.id.compareTo(b.id));
    if (mounted) setState(() => tasks = next);
  }

  SmsTask? parseTask(String id, dynamic value) {
    String? phone;
    String? msg;
    try {
      if (value is List && value.length >= 2) {
        phone = value[0]?.toString();
        msg = value[1]?.toString();
      } else if (value is Map) {
        phone = (value['mobile'] ?? value['phone'] ?? value['0'] ?? value[0])?.toString();
        msg = (value['message'] ?? value['body'] ?? value['1'] ?? value[1])?.toString();
      }
      if (phone == null || phone.trim().isEmpty || msg == null || msg.trim().isEmpty) return null;

      return SmsTask(
        id: id,
        phone: phone.trim(),
        message: msg.trim(),
        status: inflight.contains(id) ? 'sending' : 'pending',
      );
    } catch (_) {
      return null;
    }
  }

  SmsTask? parseTaskFromFirestoreDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    try {
      final Map<String, dynamic> data = doc.data() ?? <String, dynamic>{};
      final String phone = (data['mobile'] ?? data['phone'] ?? '').toString().trim();
      final String message = (data['message'] ?? data['body'] ?? '').toString().trim();
      final String status = (data['status'] ?? '').toString().trim().toLowerCase();
      if (phone.isEmpty || message.isEmpty) return null;
      if (status.isNotEmpty && status != 'pending') return null;
      return SmsTask(
        id: doc.id,
        phone: phone,
        message: message,
        status: inflight.contains(doc.id) ? 'sending' : 'pending',
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> processPendingFromSnapshot(DataSnapshot snapshot) async {
    if (!smsPermissionGranted || !snapshot.exists || snapshot.value == null) return;
    final dynamic raw = snapshot.value;
    if (raw is! Map) return;

    for (final MapEntry<dynamic, dynamic> entry in raw.entries) {
      final String id = entry.key.toString();
      if (inflight.contains(id)) continue;
      final SmsTask? task = parseTask(id, entry.value);
      if (task != null) await sendOne(task);
    }
  }

  Future<void> _writeSmsAudit(String id, Map<String, dynamic> data) async {
    await FirebaseFirestore.instance
        .collection('sms_logs')
        .doc(id)
        .set(<String, dynamic>{
      'businessId': widget.businessId,
      'updatedAt': FieldValue.serverTimestamp(),
      ...data,
    }, SetOptions(merge: true)).catchError((_) {});
  }

  Future<void> sendOne(SmsTask task) async {
    inflight.add(task.id);
    setTaskStatus(task.id, 'sending');

    try {
      final UniversalSmsOutcome outcome = await sendSmsUniversal(
        phone: task.phone,
        body: task.message,
        telephonyTimeout: Duration(seconds: _telephonyTimeoutSeconds),
      );

      if (outcome.success) {
        if (queueRef != null) {
          await queueRef!.child(task.id).remove();
        }
        await FirebaseFirestore.instance
            .collection('sms_gateway')
            .doc(widget.businessId)
            .collection('pending_sms')
            .doc(task.id)
            .delete()
            .catchError((_) {});
        await FirebaseFirestore.instance.collection('pending_sms').doc(task.id).set({
          'status': 'sent',
          'sentAt': FieldValue.serverTimestamp(),
          'deliverySource': 'android_native_gateway',
          'gatewayTrace': outcome.summaryForUi,
          'gatewayDebug': outcome.fullTrace,
        }, SetOptions(merge: true)).catchError((_) {});
        await _writeSmsAudit(task.id, <String, dynamic>{
          'id': task.id,
          'phone': task.phone,
          'message': task.message,
          'status': 'sent',
          'deliverySource': 'android_native_gateway',
          'sentAt': FieldValue.serverTimestamp(),
          'gatewayTrace': outcome.summaryForUi,
          'gatewayDebug': outcome.fullTrace,
        });
        setTaskStatus(task.id, 'sent');
        if (mounted) {
          setState(() {
            lastSmsDiagnostics = outcome.fullTrace.trim();
            connectionStatus = 'Connected — last send: ${outcome.summaryForUi}';
          });
        }
      } else {
        debugPrint('SMS pipeline failed:\n${outcome.fullTrace}');
        await FirebaseFirestore.instance.collection('pending_sms').doc(task.id).set({
          'status': 'failed',
          'failedAt': FieldValue.serverTimestamp(),
          'deliverySource': 'android_native_gateway',
          'errorMessage': outcome.summaryForUi,
          'gatewayDebug': outcome.fullTrace,
        }, SetOptions(merge: true)).catchError((_) {});
        await _writeSmsAudit(task.id, <String, dynamic>{
          'id': task.id,
          'phone': task.phone,
          'message': task.message,
          'status': 'failed',
          'deliverySource': 'android_native_gateway',
          'failedAt': FieldValue.serverTimestamp(),
          'errorMessage': outcome.summaryForUi,
          'gatewayDebug': outcome.fullTrace,
        });
        if (mounted) {
          setState(() {
            lastSmsDiagnostics = outcome.fullTrace.trim();
            connectionStatus = 'Last SMS failed — ${outcome.summaryForUi}';
          });
        }
        setTaskStatus(task.id, 'failed');
      }
    } catch (e) {
      debugPrint('sendOne unexpected: $e');
      await FirebaseFirestore.instance.collection('pending_sms').doc(task.id).set({
        'status': 'failed',
        'failedAt': FieldValue.serverTimestamp(),
        'deliverySource': 'android_native_gateway',
        'errorMessage': 'Unexpected error in sendOne: $e',
      }, SetOptions(merge: true)).catchError((_) {});
      await _writeSmsAudit(task.id, <String, dynamic>{
        'id': task.id,
        'phone': task.phone,
        'message': task.message,
        'status': 'failed',
        'deliverySource': 'android_native_gateway',
        'failedAt': FieldValue.serverTimestamp(),
        'errorMessage': 'Unexpected error in sendOne: $e',
      });
      if (mounted) {
        setState(() {
          lastSmsDiagnostics = 'Unexpected error in sendOne: $e';
          connectionStatus = 'Last SMS failed — unexpected: $e';
        });
      }
      setTaskStatus(task.id, 'failed');
    } finally {
      inflight.remove(task.id);
    }
  }

  void setTaskStatus(String id, String status) {
    if (mounted) {
      setState(() {
        tasks = tasks.map((SmsTask t) => t.id == id ? t.copyWith(status: status) : t).toList();
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    queueSub?.cancel();
    firestorePendingSub?.cancel();
    businessSub?.cancel();
    settingsSub?.cancel();
    super.dispose();
  }

  /// Green dot when the gateway is healthy. Note: normal queue monitoring uses
  /// "Gateway live …" strings (no "Connected" substring), so we must treat those as OK.
  bool get _statusOk {
    if (connectionStatus.startsWith('Last SMS failed')) return false;
    final String s = connectionStatus;
    if (s.contains('SMS permission denied') ||
        s.startsWith('Gateway init error') ||
        s.contains('Firebase stream error')) {
      return false;
    }
    if (s == 'Service stopped by user') return false;
    if (s.startsWith('Initializing service')) return false;
    return s.contains('Connected') || s.contains('Gateway live');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DigiBiz Gateway v2.0'),
        actions: <Widget>[
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: fetchAndProcessOnce,
          ),
        ],
      ),
      body: Column(
        children: <Widget>[
          Card(
            margin: const EdgeInsets.all(12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Icon(Icons.circle, color: _statusOk && serviceEnabled ? Colors.green : Colors.red, size: 14),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(connectionStatus, style: const TextStyle(fontWeight: FontWeight.w700)),
                      ),
                      Switch(
                        value: serviceEnabled,
                        onChanged: smsPermissionGranted
                            ? (bool v) async {
                                if (v) {
                                  await _startService();
                                } else {
                                  await _stopService();
                                }
                              }
                            : null,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Business: $businessName', style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('SMS Header: [$smsHeader]', style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('SMS Wallet Balance: $smsBalance', style: const TextStyle(fontWeight: FontWeight.w700)),
                  if (deviceInfoLine.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(deviceInfoLine, style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                    ),
                  if (lastSmsDiagnostics.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: SelectableText(
                        'Last send diagnostics:\n$lastSmsDiagnostics',
                        style: TextStyle(fontSize: 10, color: Colors.amber.shade200, height: 1.25),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const Divider(),
          Expanded(
            child: tasks.isEmpty
                ? const Center(child: Text('No pending messages'))
                : ListView.builder(
                    itemCount: tasks.length,
                    itemBuilder: (BuildContext context, int index) {
                      final SmsTask t = tasks[index];
                      return Card(
                        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        child: ListTile(
                          title: Text(t.phone, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text(t.message),
                          trailing: _buildStatusWidget(t.status),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusWidget(String status) {
    switch (status) {
      case 'sending':
        return const SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(strokeWidth: 2),
        );
      case 'sent':
        return const Icon(Icons.check_circle, color: Colors.green);
      case 'failed':
        return const Icon(Icons.error, color: Colors.red);
      default:
        return Text(status.toUpperCase(), style: const TextStyle(fontSize: 10));
    }
  }
}
