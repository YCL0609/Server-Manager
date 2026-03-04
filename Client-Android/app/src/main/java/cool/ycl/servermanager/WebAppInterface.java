package cool.ycl.servermanager;

import android.content.Context;
import android.webkit.JavascriptInterface;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class WebAppInterface {
    private static final NotificationHelper NotificationHelper = new NotificationHelper("default", "Default", "默认通知渠道");
    private static int NotificationId = 0;
    private static final String AcceptRegEx = "^(?!.*\\.{2})[a-zA-Z0-9._-]+(?<!\\.)$";
    Context mContext;

    WebAppInterface(Context c) {
        mContext = c;
    }

    @JavascriptInterface
    public int showToast(String title, String content) {
        NotificationId++;
        NotificationHelper.showNotification(mContext, NotificationId, R.mipmap.ic_launcher, title, content);
        return NotificationId;
    }

    @JavascriptInterface
    public void removeToast(int id) {
        if (id == 0) {
            NotificationHelper.cancelAllNotifications(mContext);
        } else if (id > 0) {
            NotificationHelper.cancelNotification(mContext, id);
        }
    }

    @JavascriptInterface
    public boolean saveFile(String fileName, String content) {
        if (!fileName.matches(AcceptRegEx)) return false;
        try (FileOutputStream outputStream = mContext.openFileOutput(fileName, Context.MODE_PRIVATE)) {
            if (content != null) {
                outputStream.write(content.getBytes(StandardCharsets.UTF_8));
            }
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    @JavascriptInterface
    public String readFile(String fileName, String defaultValue) {
        if (!fileName.matches(AcceptRegEx)) return defaultValue;

        StringBuilder stringBuilder = new StringBuilder();
        // FileInputStream -> InputStreamReader -> BufferedReader
        try (FileInputStream inputStream = mContext.openFileInput(fileName);
             InputStreamReader streamReader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);
             BufferedReader buffer = new BufferedReader(streamReader)) {

            String line;
            while ((line = buffer.readLine()) != null) {
                stringBuilder.append(line).append('\n');
            }

            return stringBuilder.toString();
        } catch (IOException e) {
            // 文件不存在或读取失败时返回默认值
            return defaultValue;
        }
    }

    @JavascriptInterface
    public boolean deleteFile(String fileName) {
        if (!fileName.matches(AcceptRegEx)) return false;
        if (!mContext.getFileStreamPath(fileName).exists()) return false;
        return mContext.deleteFile(fileName);
    }

    @JavascriptInterface
    public int saveSecureFile(String name, String data) {
        byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
        return SecureFileHelper.saveSecureFile(mContext, new String[]{""}, name, bytes);
    }

    @JavascriptInterface
    public String readSecureFile(String name) {
        byte[] bytes = SecureFileHelper.readSecureFile(mContext, new String[]{""}, name);
        return new String(bytes, StandardCharsets.UTF_8);
    }
}