package pl.lotypoz;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView web;
    static final String BASE = "file:///android_asset/index.html";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#0d1420"));
        getWindow().setNavigationBarColor(Color.parseColor("#0d1420"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0d1420"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportMultipleWindows(false);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("file".equals(u.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });
        setContentView(web);
        web.loadUrl(urlFor(getIntent()));
        Alerts.schedule(this, Settings.load(this));
    }

    String urlFor(Intent i) {
        return (i != null && "alerts".equals(i.getStringExtra("tab"))) ? BASE + "#alerts" : BASE;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (web != null && "alerts".equals(intent.getStringExtra("tab"))) web.loadUrl(BASE + "#alerts");
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    void js(final String code) {
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    void askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
            runOnUiThread(() -> requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1));
        }
    }

    class Bridge {
        @JavascriptInterface
        public String getSettings() {
            return Settings.load(MainActivity.this).toJson().toString();
        }

        @JavascriptInterface
        public void saveSettings(String json) {
            Settings st = Settings.fromJson(json);
            if (st == null) return;
            st.save(MainActivity.this);
            Alerts.schedule(MainActivity.this, st);
            if (st.enabled) askNotificationPermission();
        }

        @JavascriptInterface
        public String getLastDeals() {
            return Settings.prefs(MainActivity.this).getString("last", "[]");
        }

        @JavascriptInterface
        public double getLastTime() {
            return Settings.prefs(MainActivity.this).getLong("lastTime", 0);
        }

        @JavascriptInterface
        public void checkNow() {
            new Thread(() -> {
                String res;
                try {
                    int fresh = Alerts.runCheck(MainActivity.this);
                    res = "{\"ok\":true,\"fresh\":" + fresh + "}";
                } catch (Exception e) {
                    res = "{\"error\":" + JSONObject.quote(String.valueOf(e.getMessage())) + "}";
                }
                js("window.onCheckDone && window.onCheckDone(" + res + ")");
            }).start();
        }

        @JavascriptInterface
        public void testNotification() {
            askNotificationPermission();
            Alerts.show(MainActivity.this, "✈ Test powiadomienia", "Tak będą wyglądać alerty o tanich lotach.");
        }
    }
}
