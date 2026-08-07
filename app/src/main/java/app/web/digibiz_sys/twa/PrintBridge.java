package app.web.digibiz_sys.twa;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

public class PrintBridge {
    private static final String TAG = "PrintBridge";
    private Context context;
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    public PrintBridge(Context context) {
        this.context = context;
    }

    @JavascriptInterface
    public boolean checkRawBTInstalled() {
        try {
            PackageManager pm = context.getPackageManager();
            pm.getPackageInfo("com.rawbt.print", PackageManager.GET_ACTIVITIES);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    @JavascriptInterface
    public void printWithRawBT(String receiptData) {
        try {
            PackageManager pm = context.getPackageManager();
            Intent checkIntent = pm.getLaunchIntentForPackage("com.rawbt.print");
            
            if (checkIntent == null) {
                showToast("⚠️ RawBT App is not installed. Redirecting to Play Store...");
                Uri marketUri = Uri.parse("market://details?id=com.rawbt.print");
                Intent marketIntent = new Intent(Intent.ACTION_VIEW, marketUri);
                marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(marketIntent);
                return;
            }
            
            String base64Data = Base64.encodeToString(receiptData.getBytes("UTF-8"), Base64.NO_WRAP);
            Intent rawbtIntent = new Intent();
            rawbtIntent.setPackage("com.rawbt.print");
            rawbtIntent.setAction(Intent.ACTION_VIEW);
            rawbtIntent.setData(Uri.parse("rawbt:data:text/plain;base64," + base64Data));
            rawbtIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(rawbtIntent);
            
            Log.d(TAG, "✅ RawBT Intent sent successfully!");
            showToast("🚀 Transmitted to RawBT Print Engine!");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ RawBT Intent Error: " + e.getMessage());
            showToast("Print Note: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public void printReceipt(String text) {
        // Preferred RawBT Intent Engine execution if installed
        if (checkRawBTInstalled()) {
            printWithRawBT(text);
            return;
        }

        new Thread(() -> {
            BluetoothSocket socket = null;
            OutputStream os = null;
            try {
                Log.d(TAG, "1. Print Triggered. Checking Bluetooth Adapter...");
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null || !adapter.isEnabled()) {
                    showToast("⚠️ Bluetooth is OFF on phone!");
                    return;
                }

                BluetoothDevice targetDevice = null;
                Set<BluetoothDevice> pairedDevices = adapter.getBondedDevices();
                if (pairedDevices != null) {
                    for (BluetoothDevice device : pairedDevices) {
                        String name = device.getName();
                        Log.d(TAG, "Paired Device: " + name + " [" + device.getAddress() + "]");
                        if (name != null && (name.contains("MHT") || name.contains("Milestone") || name.contains("POS") || name.contains("BT"))) {
                            targetDevice = device;
                            break;
                        }
                    }
                }

                if (targetDevice == null && pairedDevices != null && !pairedDevices.isEmpty()) {
                    targetDevice = pairedDevices.iterator().next();
                }

                if (targetDevice == null) {
                    showToast("⚠️ No paired MHT/Milestone printer found!");
                    return;
                }

                Log.d(TAG, "1. Connecting to " + targetDevice.getAddress());
                socket = targetDevice.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                Log.d(TAG, "2. Connected: " + socket.isConnected());

                os = socket.getOutputStream();

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                baos.write(new byte[]{0x1B, 0x40});
                baos.write(new byte[]{0x1D, 0x57, (byte)0x40, (byte)0x02});

                byte[] printBytes = text.getBytes("UTF-8");
                baos.write(printBytes);

                baos.write(new byte[]{0x1B, 0x64, 0x05});
                baos.write(new byte[]{0x1D, 0x56, 0x01});

                byte[] finalStream = baos.toByteArray();
                Log.d(TAG, "3. Transmitting " + finalStream.length + " ESC/POS bytes...");
                
                int chunkSize = 128;
                for (int i = 0; i < finalStream.length; i += chunkSize) {
                    int len = Math.min(chunkSize, finalStream.length - i);
                    os.write(finalStream, i, len);
                    os.flush();
                    Thread.sleep(20);
                }

                Thread.sleep(200);
                Log.d(TAG, "4. Print Complete!");
                showToast("🎉 80mm Receipt Printed Successfully!");

            } catch (Exception e) {
                Log.e(TAG, "Print Error: " + e.getMessage(), e);
                showToast("Print Note: " + e.getMessage());
            } finally {
                try { if (os != null) os.close(); } catch(Exception e) {}
                try { if (socket != null) socket.close(); } catch(Exception e) {}
            }
        }).start();
    }

    private void showToast(String msg) {
        if (context != null) {
            new android.os.Handler(android.os.Looper.getMainLooper()).post(() ->
                Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
            );
        }
    }
}
