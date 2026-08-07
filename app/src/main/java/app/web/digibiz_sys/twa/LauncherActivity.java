package app.web.digibiz_sys.twa;

import android.app.Activity;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public class LauncherActivity extends Activity {

    private WebView mWebView;
    private PlayBillingHelper mPlayBillingHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Hide title bar and set full screen
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(0xFF0F3B2C); // Retail theme green

        mWebView = new WebView(this);
        mWebView.setBackgroundColor(0xFF0F3B2C);
        layout.addView(mWebView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        setContentView(layout);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        mPlayBillingHelper = new PlayBillingHelper(this);
        mWebView.addJavascriptInterface(new PrintBridge(this), "AndroidBridge");
        mWebView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void launchPlayPurchase() {
                runOnUiThread(() -> {
                    if (mPlayBillingHelper != null) {
                        mPlayBillingHelper.launchPurchaseFlow();
                    }
                });
            }

            @android.webkit.JavascriptInterface
            public void signOut() {
                runOnUiThread(() -> {
                    if (mWebView != null) {
                        mWebView.clearCache(true);
                        mWebView.clearHistory();
                        try {
                            android.webkit.WebStorage.getInstance().deleteAllData();
                        } catch (Exception e) {}
                        mWebView.loadUrl("https://digibiz-sys.web.app/auth/login.html");
                    }
                });
            }
        }, "androidApp");

        String defaultUA = settings.getUserAgentString();
        settings.setUserAgentString(defaultUA + " DIGIBIZ_ANDROID_APP");

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.proceed();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient());

        long timestamp = System.currentTimeMillis();
        mWebView.loadUrl("https://digibiz-sys.web.app/modules/retail/pos.html?platform=android&cb=" + timestamp);
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
