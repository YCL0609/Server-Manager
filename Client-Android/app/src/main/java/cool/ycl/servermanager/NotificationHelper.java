package cool.ycl.servermanager;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

public class NotificationHelper {
    private static String CHANNEL_ID, CHANNEL_NAME, CHANNEL_DESC;

    /**
     * 创建一个通知渠道
     */
    NotificationHelper(String Id, String Name, String Desc) {
        CHANNEL_ID = Id;
        CHANNEL_NAME = Name;
        CHANNEL_DESC = Desc;
    }

    /**
     * 发送一条简单的通知
     *
     * @param context 上下文
     * @param id      ID
     * @param icon    图标资源标识符
     * @param title   标题
     * @param message 内容
     */
    @SuppressWarnings("MissingPermission")
    public void showNotification(Context context, int id, int icon, String title, String message) {
        // 检查权限 (Android 13+)
        if (!hasPermission(context)) {
            // Activity 内调用, 尝试请求权限
            if (context instanceof Activity) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
                }
            }
            return;
        }

        // 创建通知渠道 (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription(CHANNEL_DESC);

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }

        // 构建通知对象
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(icon)
                .setContentTitle(title).setContentText(message).setPriority(NotificationCompat.PRIORITY_DEFAULT) // 兼容旧版
                .setAutoCancel(true);

        // 弹出通知
        NotificationManagerCompat.from(context).notify(id, builder.build());
    }

    /**
     * 撤销 指定ID的通知
     *
     * @param context 上下文
     * @param id      发送通知时使用的 ID
     */
    public void cancelNotification(Context context, int id) {
        NotificationManagerCompat.from(context).cancel(id);
    }

    /**
     * 撤销 应用发出的所有通知
     *
     * @param context 上下文
     */
    public void cancelAllNotifications(Context context) {
        NotificationManagerCompat.from(context).cancelAll();
    }

    /**
     * 查询是否有通知权限
     *
     * @param context 上下文
     * @return 是否有通知权限
     */
    public static boolean hasPermission(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }
        return true; // Android 13 以下默认视为有权限
    }
}