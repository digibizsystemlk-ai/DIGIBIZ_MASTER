package com.digibiz.smsgateway;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.telephony.SmsManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.tasks.Tasks;
import com.google.firebase.firestore.DocumentChange;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.SetOptions;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Foreground service: listens to {@code pending_sms} and sends via {@link SmsManager}
 * (no SMS UI). Sets {@code status} to {@code sent} and {@code sentAt} server timestamp.
 */
public class SmsGatewayForegroundService extends Service {
    private static final String TAG = "DigiBizSms";
    public static final String EXTRA_BUSINESS_ID = "businessId";
    public static final String EXTRA_BUSINESS_NAME = "businessName";

    private static final int NOTIF_ID = 7101;

    private final Set<String> inflight = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private ListenerRegistration registration;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String businessId = intent.getStringExtra(EXTRA_BUSINESS_ID);
        String businessName = intent.getStringExtra(EXTRA_BUSINESS_NAME);
        if (businessId == null || businessId.isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIF_ID, buildNotification(businessName, businessId));
        attachListener(businessId);
        return START_STICKY;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationChannel ch = new NotificationChannel(
                getString(R.string.notif_channel_id),
                getString(R.string.notif_channel_name),
                NotificationManager.IMPORTANCE_LOW
        );
        ch.setDescription("Keeps Firestore SMS listener alive");
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) {
            nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification(@Nullable String businessName, String businessId) {
        Intent open = new Intent(this, MainActivity.class);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= 23) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, flags);
        String line2 = (businessName != null && !businessName.isEmpty())
                ? businessName + " · " + businessId
                : businessId;

        return new NotificationCompat.Builder(this, getString(R.string.notif_channel_id))
                .setContentTitle(getString(R.string.notif_title))
                .setContentText(line2 + " — " + getString(R.string.notif_text_listening))
                .setSmallIcon(android.R.drawable.stat_sys_upload_done)
                .setOngoing(true)
                .setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void attachListener(String businessId) {
        if (registration != null) {
            registration.remove();
            registration = null;
        }

        FirebaseFirestore db = FirebaseFirestore.getInstance();
        Query q = db.collection("pending_sms")
                .whereEqualTo("businessId", businessId)
                .whereEqualTo("status", "pending")
                .orderBy("createdAt", Query.Direction.ASCENDING);

        registration = q.addSnapshotListener((snap, e) -> {
            if (e != null) {
                Log.e(TAG, "pending_sms listener", e);
                return;
            }
            if (snap == null) {
                return;
            }
            for (DocumentChange change : snap.getDocumentChanges()) {
                if (change.getType() != DocumentChange.Type.ADDED
                        && change.getType() != DocumentChange.Type.MODIFIED) {
                    continue;
                }
                handleDoc(db, change.getDocument());
            }
        });
    }

    private void handleDoc(FirebaseFirestore db, DocumentSnapshot doc) {
        String id = doc.getId();
        if (!inflight.add(id)) {
            return;
        }
        if (!"pending".equals(doc.getString("status"))) {
            inflight.remove(id);
            return;
        }
        String mobile = doc.getString("mobile");
        String message = doc.getString("message");
        if (mobile == null || message == null || mobile.isEmpty() || message.isEmpty()) {
            inflight.remove(id);
            return;
        }

        new Thread(() -> {
            try {
                sendSms(mobile, message);
                Map<String, Object> upd = new HashMap<>();
                upd.put("status", "sent");
                upd.put("sentAt", FieldValue.serverTimestamp());
                upd.put("deliverySource", "android_foreground_service");
                Tasks.await(db.collection("pending_sms").document(id).update(upd));
                Map<String, Object> audit = new HashMap<>();
                audit.put("id", id);
                audit.put("businessId", doc.getString("businessId"));
                audit.put("mobile", mobile);
                audit.put("message", message);
                audit.put("status", "sent");
                audit.put("sentAt", FieldValue.serverTimestamp());
                audit.put("deliverySource", "android_foreground_service");
                audit.put("updatedAt", FieldValue.serverTimestamp());
                Tasks.await(db.collection("sms_logs").document(id).set(audit, SetOptions.merge()));
                Log.i(TAG, "Marked sent: " + id);
            } catch (Exception ex) {
                Log.e(TAG, "Send/update failed " + id, ex);
                try {
                    Map<String, Object> fail = new HashMap<>();
                    fail.put("status", "failed");
                    fail.put("failedAt", FieldValue.serverTimestamp());
                    fail.put("deliverySource", "android_foreground_service");
                    fail.put("errorMessage", ex.getMessage());
                    Tasks.await(db.collection("pending_sms").document(id).set(fail, SetOptions.merge()));
                    Map<String, Object> auditFail = new HashMap<>();
                    auditFail.put("id", id);
                    auditFail.put("businessId", doc.getString("businessId"));
                    auditFail.put("mobile", mobile);
                    auditFail.put("message", message);
                    auditFail.put("status", "failed");
                    auditFail.put("failedAt", FieldValue.serverTimestamp());
                    auditFail.put("deliverySource", "android_foreground_service");
                    auditFail.put("errorMessage", ex.getMessage());
                    auditFail.put("updatedAt", FieldValue.serverTimestamp());
                    Tasks.await(db.collection("sms_logs").document(id).set(auditFail, SetOptions.merge()));
                } catch (Exception ignored) {
                    Log.e(TAG, "Failed to update failure audit for " + id, ignored);
                }
            } finally {
                inflight.remove(id);
            }
        }, "sms-" + id).start();
    }

    private void sendSms(String rawTo, String body) {
        String dest = formatAddress(rawTo);
        SmsManager sm = SmsManager.getDefault();
        ArrayList<String> parts = sm.divideMessage(body);
        if (parts == null || parts.size() <= 1) {
            sm.sendTextMessage(dest, null, body, null, null);
        } else {
            sm.sendMultipartTextMessage(dest, null, parts, null, null);
        }
        Log.i(TAG, "SMS dispatched to " + dest);
    }

    /** Aligns with web queue: 07… / 9-digit → 94… digits only. */
    static String formatAddress(String raw) {
        String m = String.valueOf(raw).replaceAll("[^0-9]", "");
        if (m.length() == 10 && m.startsWith("0")) {
            m = "94" + m.substring(1);
        }
        if (m.length() == 9) {
            m = "94" + m;
        }
        return m;
    }

    @Override
    public void onDestroy() {
        if (registration != null) {
            registration.remove();
            registration = null;
        }
        inflight.clear();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
