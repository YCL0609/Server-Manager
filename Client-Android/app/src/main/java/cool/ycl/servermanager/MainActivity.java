package cool.ycl.servermanager;

import android.content.Intent;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.EdgeToEdge;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader; // 需要引入

public class MainActivity extends AppCompatActivity {

    private ValueCallback<Uri[]> mUploadMessage;

    private final ActivityResultLauncher<Intent> mFileChooserLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (mUploadMessage == null) return;
                Uri[] results = null;
                if (result.getResultCode() == AppCompatActivity.RESULT_OK && result.getData() != null) {
                    String dataString = result.getData().getDataString();
                    if (dataString != null) results = new Uri[]{Uri.parse(dataString)};
                }
                mUploadMessage.onReceiveValue(results);
                mUploadMessage = null;
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setContentView(R.layout.activity_main);

        WebView wv = findViewById(R.id.webview);

        // 配置虚拟域名映射
        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain("appassets.androidplatform.net")
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings webSettings = wv.getSettings();
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setAllowContentAccess(false);
        webSettings.setAllowFileAccess(false);
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(false);

        String userAgent = webSettings.getUserAgentString();
        webSettings.setUserAgentString(userAgent + " ServerManager/1.0");

        wv.setWebViewClient(new WebViewClient() {
            // 转发虚拟域名请求
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            // 拦截外部链接
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                return !url.startsWith("https://appassets.androidplatform.net/");
            }
        });

        wv.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mUploadMessage != null) mUploadMessage.onReceiveValue(null);
                mUploadMessage = filePathCallback;
                Intent intent = fileChooserParams.createIntent();
                try {
                    mFileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    mUploadMessage = null;
                    return false;
                }
                return true;
            }
        });

        wv.addJavascriptInterface(new WebAppInterface(this), "appBridge");
        wv.loadUrl("https://appassets.androidplatform.net/assets/list.html");
    }

    // 防止屏幕变换时刷新
    @Override
    public void onConfigurationChanged(@NonNull Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
    }
}