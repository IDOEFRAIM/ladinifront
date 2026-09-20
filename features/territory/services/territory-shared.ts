export function checkIdRequired(id: string) {
  if (!id) return { success: false, error: "ID requis" };
  return null;
}
