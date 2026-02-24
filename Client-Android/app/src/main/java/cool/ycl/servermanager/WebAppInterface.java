package cool.ycl.servermanager;

import android.content.Context;
import android.webkit.JavascriptInterface;

public class WebAppInterface {
    private static final NotificationHelper NotificationHelper = new NotificationHelper("default", "Default", "默认通知渠道");
    private static int NotificationId = 0;
    Context mContext;

    WebAppInterface(Context c) {
        mContext = c;
    }

    @JavascriptInterface
    public void showToast( String title, String content) {
        NotificationId++;
        NotificationHelper.showNotification(mContext, NotificationId, title, content);
    }
}
