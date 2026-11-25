import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ApiError,
  createApi,
  DOC_LABEL,
  eur,
  ORDER_LABEL,
  screenFromNotification,
  STAGE_LABEL,
  trDate,
  type Api,
  type OrderRow,
  type Overview,
  type ShipmentDetail,
  type ShipmentRow,
  type StockItem,
} from "./src/api";
import { registerForPush } from "./src/notifications";

const TOKEN_KEY = "as_token";
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://avrupadasat.com";
const C = {
  p: "#c8102e",
  ink: "#0b1324",
  mute: "#5b6478",
  line: "#e5e8ef",
  bg: "#f5f7fb",
  ok: "#138a4b",
  warn: "#b86e00",
};

type Tab = "home" | "shipments" | "stock" | "orders";

export default function App() {
  const tokenRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const api = useMemo(() => createApi(API_URL, () => tokenRef.current), []);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((t) => {
        tokenRef.current = t;
        setAuthed(Boolean(t));
      })
      .finally(() => setReady(true));
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    tokenRef.current = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthed(false);
  }, [api]);

  if (!ready) return <ActivityIndicator style={{ flex: 1 }} color={C.p} />;
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="dark" />
      {authed ? (
        <Main api={api} onUnauthorized={signOut} />
      ) : (
        <Login
          api={api}
          onToken={async (t) => {
            tokenRef.current = t;
            // Token yalnız cihazın güvenli deposunda (Keychain / Keystore)
            await SecureStore.setItemAsync(TOKEN_KEY, t);
            setAuthed(true);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function Login({ api, onToken }: { api: Api; onToken: (t: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.login(email, password, code);
      onToken(r.token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Bağlantı kurulamadı");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <Logo />
      <Text style={s.h1}>Müşteri girişi</Text>
      {error && <Text style={s.err}>{error}</Text>}
      <TextInput
        style={s.input}
        placeholder="E-posta"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={s.input}
        placeholder="Şifre"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={s.input}
        placeholder="2FA kodu (6 hane)"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <Pressable
        style={[s.btn, busy && { opacity: 0.6 }]}
        onPress={submit}
        disabled={busy}
        accessibilityRole="button"
      >
        <Text style={s.btnText}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}</Text>
      </Pressable>
      <Text style={s.mute}>Hesabınızı web panelinden davetle oluşturabilirsiniz.</Text>
    </ScrollView>
  );
}

function Main({ api, onUnauthorized }: { api: Api; onUnauthorized: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [detail, setDetail] = useState<string | null>(null);
  const [account, setAccount] = useState(false);
  useEffect(() => {
    registerForPush(api).catch(() => undefined);
    // Bildirime dokununca ilgili sekme açılır
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const screen = screenFromNotification(r.notification.request.content.data);
      if (screen) {
        setDetail(null);
        setAccount(false);
        setTab(screen);
      }
    });
    return () => sub.remove();
  }, [api]);
  const guard = useCallback(
    async <T,>(p: Promise<T>): Promise<T | null> => {
      try {
        return await p;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) onUnauthorized();
        return null;
      }
    },
    [onUnauthorized],
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {account ? (
          <AccountScreen api={api} onBack={() => setAccount(false)} onSignOut={onUnauthorized} />
        ) : detail ? (
          <ShipmentScreen id={detail} api={api} guard={guard} onBack={() => setDetail(null)} />
        ) : tab === "home" ? (
          <HomeScreen api={api} guard={guard} onAccount={() => setAccount(true)} />
        ) : tab === "shipments" ? (
          <ShipmentsScreen api={api} guard={guard} onOpen={setDetail} />
        ) : tab === "stock" ? (
          <StockScreen api={api} guard={guard} />
        ) : (
          <OrdersScreen api={api} guard={guard} />
        )}
      </View>
      <View style={s.tabs} accessibilityRole="tablist">
        {(
          [
            ["home", "Özet"],
            ["shipments", "Sevkiyat"],
            ["stock", "Stok"],
            ["orders", "Sipariş"],
          ] as const
        ).map(([k, l]) => (
          <Pressable
            key={k}
            style={s.tab}
            onPress={() => {
              setDetail(null);
              setAccount(false);
              setTab(k);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === k }}
          >
            <Text style={[s.tabText, tab === k && { color: C.p }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type Guard = <T>(p: Promise<T>) => Promise<T | null>;

function useLoad<T>(load: () => Promise<T | null>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    setData(await load());
    setLoading(false);
  }, [load]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data, loading, refresh };
}

function HomeScreen({ api, guard, onAccount }: { api: Api; guard: Guard; onAccount: () => void }) {
  const load = useCallback(() => guard<Overview>(api.overview()), [api, guard]);
  const { data, loading, refresh } = useLoad(load);
  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, gap: 12 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Logo />
        <Pressable onPress={onAccount} accessibilityRole="button" hitSlop={12}>
          <Text style={{ color: C.p, fontWeight: "700" }}>Hesap</Text>
        </Pressable>
      </View>
      {data?.salesLocked && (
        <Text style={s.note}>Satış adımları vergi kayıtları tamamlanınca açılacak.</Text>
      )}
      <View style={s.grid}>
        <Kpi
          label={`Son ${data?.sales.days ?? 30} gün ciro`}
          value={data ? eur(data.sales.revenueCents).replace(/,\d\d$/, "") : "—"}
        />
        <Kpi label="Sipariş" value={String(data?.sales.orders ?? "—")} />
        <Kpi label="Depodaki ürün" value={String(data?.units ?? "—")} />
        <Kpi label="Yoldaki sevkiyat" value={String(data?.activeShipments ?? "—")} />
        <Kpi label="Bekleyen kayıt" value={String(data?.pendingSteps ?? "—")} />
        <Kpi
          label="Eksik belge"
          value={String(data?.missingDocs.length ?? "—")}
          danger={Boolean(data?.missingDocs.length)}
        />
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Bu arada hazırlayabilecekleriniz</Text>
        {data?.waiting.map((w) => (
          <Text key={w.id} style={{ marginTop: 6 }}>
            {w.done ? "✓" : "○"} {w.title}
          </Text>
        ))}
      </View>
      {data?.lowStock.length ? (
        <View style={s.card}>
          <Text style={s.h2}>Düşük stok</Text>
          {data.lowStock.map((i) => (
            <Text key={i.sku} style={{ marginTop: 6 }}>
              {i.name} ({i.sku}): {i.quantity}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function AccountScreen({
  api,
  onBack,
  onSignOut,
}: {
  api: Api;
  onBack: () => void;
  onSignOut: () => void;
}) {
  const [me, setMe] = useState<{ name: string; tenant: { name: string } } | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.me().then(setMe, () => undefined);
  }, [api]);

  const remove = () =>
    Alert.alert(
      "Hesabınız silinsin mi?",
      "Adınız, e-posta adresiniz, parolanız ve cihaz kayıtlarınız kalıcı olarak silinir. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabımı sil",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            setError(null);
            try {
              await api.deleteAccount(password, code.trim());
              setPassword("");
              onSignOut();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : "Bağlantı hatası");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={{ color: C.p }}>‹ Geri</Text>
      </Pressable>
      <Text style={s.h1}>Hesap</Text>
      {me && (
        <View style={s.card}>
          <Text style={{ fontWeight: "700" }}>{me.name}</Text>
          <Text style={s.mute}>{me.tenant.name}</Text>
        </View>
      )}
      <Pressable
        style={[s.btn, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#d0d5dd" }]}
        onPress={onSignOut}
        accessibilityRole="button"
      >
        <Text style={[s.btnText, { color: C.ink }]}>Çıkış yap</Text>
      </Pressable>

      <Text style={[s.h2, { marginTop: 18 }]}>Hesabımı sil</Text>
      <Text style={s.mute}>
        Firmanıza ait faturalar ve sevkiyat kayıtları yasal saklama süreleri boyunca firmada
        kalabilir.
      </Text>
      <Pressable onPress={() => Linking.openURL(`${API_URL}/hesap-silme`)} accessibilityRole="link">
        <Text style={{ color: C.p }}>Ayrıntılar</Text>
      </Pressable>
      {error && <Text style={s.err}>{error}</Text>}
      <TextInput
        style={s.input}
        placeholder="Parola"
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={s.input}
        placeholder="Doğrulama kodu (2FA açıksa)"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <Pressable
        style={[s.btn, (busy || !password) && { opacity: 0.6 }]}
        disabled={busy || !password}
        onPress={remove}
        accessibilityRole="button"
      >
        <Text style={s.btnText}>{busy ? "Siliniyor…" : "Hesabımı sil"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function ShipmentsScreen({
  api,
  guard,
  onOpen,
}: {
  api: Api;
  guard: Guard;
  onOpen: (id: string) => void;
}) {
  const load = useCallback(() => guard<ShipmentRow[]>(api.shipments()), [api, guard]);
  const { data, loading, refresh } = useLoad(load);
  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      contentContainerStyle={{ padding: 18, gap: 10 }}
      ListHeaderComponent={<Text style={s.h1}>Sevkiyatlar</Text>}
      ListEmptyComponent={!loading ? <Text style={s.mute}>Sevkiyat yok.</Text> : undefined}
      renderItem={({ item }) => (
        <Pressable style={s.card} onPress={() => onOpen(item.id)} accessibilityRole="button">
          <Text style={s.h2}>{item.reference}</Text>
          <Text style={{ color: item.stage === "DEPO_KABUL" ? C.ok : C.warn, marginTop: 4 }}>
            {STAGE_LABEL[item.stage]}
          </Text>
          <Text style={s.mute}>
            {item.pallets} palet · {item.cartons} koli · tahmini {trDate(item.expectedAt)}
          </Text>
        </Pressable>
      )}
    />
  );
}

function ShipmentScreen({
  id,
  api,
  guard,
  onBack,
}: {
  id: string;
  api: Api;
  guard: Guard;
  onBack: () => void;
}) {
  const load = useCallback(() => guard<ShipmentDetail>(api.shipment(id)), [api, guard, id]);
  const { data, loading, refresh } = useLoad(load);
  return (
    <ScrollView
      contentContainerStyle={{ padding: 18, gap: 12 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={{ color: C.p }}>← Sevkiyatlar</Text>
      </Pressable>
      <Text style={s.h1}>{data?.reference ?? ""}</Text>
      {data?.missingDocs.length ? (
        <Text style={s.err}>
          Eksik belge: {data.missingDocs.map((d) => DOC_LABEL[d] ?? d).join(", ")}
        </Text>
      ) : null}
      <View style={s.card}>
        {data?.events.map((e, i) => (
          <View key={i} style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: "700" }}>{STAGE_LABEL[e.stage]}</Text>
            <Text style={s.mute}>
              {trDate(e.at)} {e.note ? `· ${e.note}` : ""}
            </Text>
          </View>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Ürünler</Text>
        {data?.lines.map((l) => (
          <Text key={l.sku} style={{ marginTop: 6 }}>
            {l.sku}: {l.quantity} bildirildi
            {l.receivedQty !== null
              ? ` · ${l.receivedQty} sayıldı${l.damagedQty ? ` · ${l.damagedQty} hasarlı` : ""}`
              : ""}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

function StockScreen({ api, guard }: { api: Api; guard: Guard }) {
  const load = useCallback(() => guard<StockItem[]>(api.stock()), [api, guard]);
  const { data, loading, refresh } = useLoad(load);
  const [q, setQ] = useState("");
  const rows = (data ?? []).filter(
    (i) => !q || `${i.sku} ${i.name}`.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")),
  );
  return (
    <FlatList
      data={rows}
      keyExtractor={(i) => i.sku}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      contentContainerStyle={{ padding: 18, gap: 8 }}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <Text style={s.h1}>Stok</Text>
          <TextInput
            style={s.input}
            placeholder="Ara (SKU veya ad)"
            value={q}
            onChangeText={setQ}
          />
        </View>
      }
      renderItem={({ item }) => (
        <View style={[s.card, { flexDirection: "row", justifyContent: "space-between" }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700" }}>{item.name}</Text>
            <Text style={s.mute}>{item.sku}</Text>
          </View>
          <Text
            style={{ fontSize: 20, fontWeight: "800", color: item.available < 10 ? C.p : C.ink }}
          >
            {item.available}
          </Text>
        </View>
      )}
    />
  );
}

function OrdersScreen({ api, guard }: { api: Api; guard: Guard }) {
  const load = useCallback(() => guard<OrderRow[]>(api.orders()), [api, guard]);
  const { data, loading, refresh } = useLoad(load);
  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(i) => i.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      contentContainerStyle={{ padding: 18, gap: 8 }}
      ListHeaderComponent={<Text style={s.h1}>Siparişler</Text>}
      ListEmptyComponent={!loading ? <Text style={s.mute}>Sipariş yok.</Text> : undefined}
      renderItem={({ item }) => (
        <View style={s.card}>
          <Text style={{ fontWeight: "700" }}>
            {item.channel} · {item.externalId}
          </Text>
          <Text style={s.mute}>
            {trDate(item.orderedAt)} · {eur(item.itemsCents)} ·{" "}
            {ORDER_LABEL[item.status] ?? item.status}
          </Text>
          {item.trackingNo && (
            <Text style={s.mute}>
              {item.carrier} {item.trackingNo}
            </Text>
          )}
        </View>
      )}
    />
  );
}

function Kpi({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={[s.card, { width: "48%" }]}>
      <Text style={s.mute}>{label}</Text>
      <Text style={{ fontSize: 26, fontWeight: "800", color: danger ? C.p : C.ink }}>{value}</Text>
    </View>
  );
}

function Logo() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: C.p,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>AS</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: "800", color: C.ink }}>
        Avrupada<Text style={{ color: C.p }}>Sat</Text>
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  h1: { fontSize: 24, fontWeight: "800", color: C.ink },
  h2: { fontSize: 17, fontWeight: "700", color: C.ink },
  mute: { color: C.mute, fontSize: 13 },
  err: { color: C.p, backgroundColor: "#fff1f3", padding: 10, borderRadius: 10 },
  note: { color: C.ink, backgroundColor: "#fff8e6", padding: 10, borderRadius: 10 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  btn: { backgroundColor: C.p, padding: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    padding: 14,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: C.line, backgroundColor: "#fff" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabText: { fontWeight: "700", color: C.mute },
});
