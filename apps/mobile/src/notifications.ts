/**
 * Anlık bildirim kaydı: izin istenir, Expo push anahtarı alınır ve oturuma bağlanır.
 * Simülatörde ve izin verilmezse sessizce atlanır; uygulama bildirimsiz de çalışır.
 */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerForPush(api: Api): Promise<void> {
  if (!Device.isDevice) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Bildirimler",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return;
  const projectId = (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
    ?.projectId;
  if (!projectId) return; // EAS projesi bağlanmadan anahtar alınamaz
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.registerPush(data);
}
