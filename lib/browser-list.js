export const listKey = "merlin-list";

export function readBrowserList(storage, products) {
  const saved = storage.getItem(listKey);
  if (saved === null) return null;
  const items = JSON.parse(saved);
  if (!Array.isArray(items)) throw Error("A lista salva neste navegador é inválida.");
  return items.filter((item) =>
    item && products.some((p) => p.id === item.id) &&
    Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 999 &&
    typeof item.checked === "boolean"
  );
}

export function saveBrowserList(storage, items) {
  if (items.length > 100 || items.some((item) =>
    !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999
  )) throw Error("Use até 100 itens e quantidades entre 1 e 999.");
  storage.setItem(listKey, JSON.stringify(items));
}
