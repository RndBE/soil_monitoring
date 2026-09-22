/**
 * Logout dari sisi klien. Sengaja pakai navigasi keras, bukan router.push,
 * supaya seluruh cache RSC milik sesi lama ikut dibuang.
 */
export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
  window.location.href = "/login"
}
