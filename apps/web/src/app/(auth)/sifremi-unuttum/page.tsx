import { ForgotForm } from "../forms";

export const metadata = { title: "Şifremi unuttum" };

export default function ForgotPage() {
  return (
    <>
      <h1 style={{ marginTop: 0, fontSize: 22 }}>Şifremi unuttum</h1>
      <ForgotForm />
    </>
  );
}
