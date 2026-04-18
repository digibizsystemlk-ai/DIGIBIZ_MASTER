package com.digibiz.smsgateway;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.FirebaseFirestore;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Signs in with Firebase Auth, resolves businessId, then starts {@link SmsGatewayForegroundService}.
 * SMS sending happens in the service (no composer). Re-opens restore the listener if prefs exist.
 */
public class MainActivity extends AppCompatActivity {
    private static final String PREF = "digibiz_sms_gateway";
    private static final String KEY_BID = "business_id";
    private static final String KEY_BNAME = "business_name";

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private FirebaseAuth auth;
    private TextInputEditText email;
    private TextInputEditText password;
    private MaterialButton btnSignIn;
    private MaterialButton btnSignOut;
    private TextView status;
    private TextView error;

    private final ActivityResultLauncher<String[]> permissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), granted -> {
                boolean smsOk = Boolean.TRUE.equals(granted.get(Manifest.permission.SEND_SMS));
                boolean notifOk = Build.VERSION.SDK_INT < 33
                        || Boolean.TRUE.equals(granted.get(Manifest.permission.POST_NOTIFICATIONS));
                if (smsOk && notifOk) {
                    attemptSignIn();
                } else {
                    showError("SMS and notification permissions are required for the gateway.");
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        auth = FirebaseAuth.getInstance();
        email = findViewById(R.id.email);
        password = findViewById(R.id.password);
        btnSignIn = findViewById(R.id.btnSignIn);
        btnSignOut = findViewById(R.id.btnSignOut);
        status = findViewById(R.id.status);
        error = findViewById(R.id.error);

        btnSignIn.setOnClickListener(v -> requestPermissionsThenSignIn());
        btnSignOut.setOnClickListener(v -> signOutAndStop());

        refreshUi(auth.getCurrentUser());
    }

    @Override
    protected void onStart() {
        super.onStart();
        FirebaseUser user = auth.getCurrentUser();
        refreshUi(user);
        if (user != null && hasRuntimePermissions() && loadSavedBusinessId() != null) {
            String bid = loadSavedBusinessId();
            String bname = getSharedPreferences(PREF, MODE_PRIVATE).getString(KEY_BNAME, "");
            startGatewayService(bid, bname);
            status.setText("Gateway running for:\n" + bname + "\n" + bid);
        }
    }

    @Nullable
    private String loadSavedBusinessId() {
        return getSharedPreferences(PREF, MODE_PRIVATE).getString(KEY_BID, null);
    }

    private void saveBusiness(@NonNull String id, String name) {
        getSharedPreferences(PREF, MODE_PRIVATE).edit()
                .putString(KEY_BID, id)
                .putString(KEY_BNAME, name != null ? name : "")
                .apply();
    }

    private void clearSavedBusiness() {
        getSharedPreferences(PREF, MODE_PRIVATE).edit().remove(KEY_BID).remove(KEY_BNAME).apply();
    }

    private void requestPermissionsThenSignIn() {
        error.setVisibility(View.GONE);
        List<String> need = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
                != PackageManager.PERMISSION_GRANTED) {
            need.add(Manifest.permission.SEND_SMS);
        }
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            need.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (need.isEmpty()) {
            attemptSignIn();
        } else {
            permissionLauncher.launch(need.toArray(new String[0]));
        }
    }

    private boolean hasRuntimePermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
                != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return Build.VERSION.SDK_INT < 33
                || ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void attemptSignIn() {
        String em = String.valueOf(email.getText()).trim();
        String pw = String.valueOf(password.getText());
        if (em.isEmpty() || pw.isEmpty()) {
            showError("Enter email and password.");
            return;
        }
        btnSignIn.setEnabled(false);
        showError(null);
        status.setText("Signing in…");

        auth.signInWithEmailAndPassword(em, pw)
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        btnSignIn.setEnabled(true);
                        Exception ex = task.getException();
                        showError(ex != null ? ex.getMessage() : "Sign-in failed.");
                        status.setText("");
                        return;
                    }
                    FirebaseUser user = auth.getCurrentUser();
                    if (user == null) {
                        btnSignIn.setEnabled(true);
                        showError("No user after sign-in.");
                        return;
                    }
                    resolveAndStart(user);
                });
    }

    private void resolveAndStart(@NonNull FirebaseUser user) {
        status.setText("Resolving business…");
        io.execute(() -> {
            try {
                FirebaseFirestore db = FirebaseFirestore.getInstance();
                BusinessResolver.Biz biz = BusinessResolver.resolveBlocking(db, user.getUid());
                runOnUiThread(() -> {
                    btnSignIn.setEnabled(true);
                    if (biz == null || biz.id == null || biz.id.isEmpty()) {
                        showError("Could not resolve business for this account.");
                        status.setText("");
                        auth.signOut();
                        return;
                    }
                    showError(null);
                    saveBusiness(biz.id, biz.name);
                    status.setText("Gateway running for:\n" + biz.name + "\n" + biz.id);
                    btnSignIn.setVisibility(View.GONE);
                    btnSignOut.setVisibility(View.VISIBLE);
                    startGatewayService(biz.id, biz.name);
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    btnSignIn.setEnabled(true);
                    showError(e.getMessage() != null ? e.getMessage() : "Resolve failed.");
                    status.setText("");
                    auth.signOut();
                });
            }
        });
    }

    private void startGatewayService(String businessId, String businessName) {
        Intent i = new Intent(this, SmsGatewayForegroundService.class);
        i.putExtra(SmsGatewayForegroundService.EXTRA_BUSINESS_ID, businessId);
        i.putExtra(SmsGatewayForegroundService.EXTRA_BUSINESS_NAME, businessName);
        ContextCompat.startForegroundService(this, i);
    }

    private void signOutAndStop() {
        stopService(new Intent(this, SmsGatewayForegroundService.class));
        clearSavedBusiness();
        auth.signOut();
        btnSignIn.setVisibility(View.VISIBLE);
        btnSignOut.setVisibility(View.GONE);
        status.setText("");
        showError(null);
    }

    private void refreshUi(FirebaseUser user) {
        if (user != null) {
            btnSignIn.setVisibility(View.GONE);
            btnSignOut.setVisibility(View.VISIBLE);
        } else {
            btnSignIn.setVisibility(View.VISIBLE);
            btnSignOut.setVisibility(View.GONE);
        }
    }

    private void showError(String msg) {
        if (msg == null || msg.isEmpty()) {
            error.setVisibility(View.GONE);
            error.setText("");
        } else {
            error.setText(msg);
            error.setVisibility(View.VISIBLE);
        }
    }

    @Override
    protected void onDestroy() {
        io.shutdown();
        super.onDestroy();
    }
}
