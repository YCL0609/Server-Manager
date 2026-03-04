package cool.ycl.servermanager;

import android.content.Context;

import androidx.security.crypto.EncryptedFile;
import androidx.security.crypto.MasterKey;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.GeneralSecurityException;
import java.util.Arrays;

public class SecureFileHelper {
    private static final String AcceptRegEx = "^(?!.*\\.{2})[a-zA-Z0-9._-]+(?<!\\.)$";

    /**
     * 获取应用主密钥。
     *
     * @param context 调用方上下文
     * @return 主密钥
     */
    @SuppressWarnings("deprecation")
    private static MasterKey getMasterKey(Context context) throws GeneralSecurityException, IOException {
        return new MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();
    }

    /**
     * 获取完整路径
     *
     * @param path 路径数组
     * @param name 文件名
     * @return 完整路径或空字符串
     */
    private static String getFullName(String[] path, String name) {
        boolean isNameOK = name.matches(AcceptRegEx);
        boolean isPathOK = true;
        for (String dir : path) {
            if (dir.isEmpty()) continue;
            if (!dir.matches(AcceptRegEx)) {
                isPathOK = false;
                break;
            }
        }
        String pathRawStr = String.join("/", path);
        String pathStr = pathRawStr.trim().isEmpty() ? "" : pathRawStr + "/";
        return (isNameOK && isPathOK) ? pathStr + name : "";
    }

    /**
     * 加密保存文件 (兼容 API 23)
     *
     * @param context 调用方上下文
     * @param path    路径数组
     * @param name    文件名
     * @param data    文件内容
     * @return 处理状态码 (0: 成功, 1: 文件名或路径不合法, 2: 写入失败, 999: 其他错误)
     */
    @SuppressWarnings("deprecation")
    public static int saveSecureFile(Context context, String[] path, String name, byte[] data) {
        try {
            // 获取完整路径
            String fullName = getFullName(path, name);
            if (fullName.isEmpty()) return 1;

            File file = new File(context.getFilesDir(), fullName);
            EncryptedFile encryptedFile = new EncryptedFile.Builder(
                    context,
                    file,
                    getMasterKey(context),
                    EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
            ).build();

            // 写入磁盘
            try (OutputStream os = encryptedFile.openFileOutput()) {
                os.write(data);
                return 0;
            } catch (IOException e) {
                return 2;
            }
        } catch (GeneralSecurityException | IOException e) {
            return 999;
        }
    }

    /**
     * 读取加密文件 (兼容 API 23)
     *
     * @param context 调用方上下文
     * @param path    路径数组
     * @param name    文件名
     * @return 文件内容或空数组
     */
    @SuppressWarnings("deprecation")
    public static byte[] readSecureFile(Context context, String[] path, String name) {
        // 获取完整路径
        String fullName = getFullName(path, name);
        if (fullName.isEmpty()) return new byte[0];

        // 获取文件对象
        File file = new File(context.getFilesDir(), fullName);
        if (!file.exists()) return new byte[0];

        try {
            // 获取加密实例
            EncryptedFile encryptedFile = new EncryptedFile.Builder(
                    context,
                    file,
                    getMasterKey(context),
                    EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
            ).build();

            // 获取内容
            try (InputStream inputStream = encryptedFile.openFileInput();
                 ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[1024];
                int len;
                // 循环读取
                while ((len = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, len);
                }
                return outputStream.toByteArray();
            } catch (IOException e) {
                return new byte[0];
            }
        } catch (GeneralSecurityException | IOException e) {
            return new byte[0];
        }
    }
}