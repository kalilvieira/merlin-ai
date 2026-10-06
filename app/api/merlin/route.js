import { identity, readRecord, saveRecord, deleteUserData } from "@/lib/server";
import {
  seedProducts,
  seedConfig,
  searchProducts,
  normalize,
  stores,
} from "@/lib/domain";
import { z } from "zod";
const validStore = (s) => stores.some((x) => x.id === s);
async function event(owner, type, data) {
  try {
    await saveRecord(crypto.randomUUID(), owner, "event", {
      type, data, time: Date.now(),
    });
  } catch {
    // Telemetria opcional não pode impedir buscas ou navegação.
    console.warn("merlin_event_not_saved");
  }
}
function error(e) {
  if (e instanceof Error && e.message === "UNAUTHORIZED")
    return Response.json(
      { error: "Entre na sua conta para continuar." },
      { status: 401 },
    );
  if (e instanceof z.ZodError)
    return Response.json(
      {
        error:
          "Revise os campos: " +
          e.issues.map((x) => x.path.join(".") + " " + x.message).join("; "),
      },
      { status: 400 },
    );
  console.error(
    "merlin_request_failed",
    e instanceof Error ? e.message : "unknown",
  );
  return Response.json(
    {
      error:
        "Não foi possível concluir. Seus dados não foram descartados; tente novamente.",
    },
    { status: 503 },
  );
}
export async function GET(req) {
  try {
    const user = await identity();
    if (new URL(req.url).searchParams.has("action"))
      return Response.json(
        { error: "Recurso indisponível neste protótipo." },
        { status: 404 },
      );
    let list = [];
    let storage = "server";
    try {
      list = await readRecord("list:" + user.id, []);
    } catch {
      storage = "browser";
      console.warn("merlin_browser_storage_enabled");
    }
    return Response.json({
      products: seedProducts,
      config: seedConfig,
      list,
      storage,
      demo: true,
    });
  } catch (e) {
    return error(e);
  }
}
export async function POST(req) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin)
      return Response.json(
        { error: "Origem não autorizada." },
        { status: 403 },
      );
    if (Number(req.headers.get("content-length") || 0) > 250000)
      return Response.json(
        { error: "Conteúdo muito grande." },
        { status: 413 },
      );
    const user = await identity(),
      body = z
        .object({ action: z.string() })
        .passthrough()
        .parse(await req.json());
    const products = seedProducts;
    switch (body.action) {
      case "search": {
        const start = Date.now();
        const query = z.string().min(1).max(500).parse(body.query),
          store = z.string().refine(validStore).parse(body.store),
          history = z
            .array(z.string().max(500))
            .max(8)
            .parse(body.history || []);
        const refinement =
          /^(\d+\s*(mm|v|m2|m²)?|agua fria|esgoto|branca|branco)$/i.test(
            query.trim(),
          );
        const prior =
          history
            .slice()
            .reverse()
            .find((s) => !/^\d+\s*(mm|v|m2|m²)?$/i.test(s.trim())) || "";
        const context = refinement ? prior + " " + query : query;
        let found = searchProducts(products, context);
        if (refinement) {
          const measure = query.match(/\b(25|50|127|220)\b/);
          if (measure)
            found = found.filter((p) => p.attributes.includes(measure[1]));
        }
        found = found.slice(0, 8);
        let reply = found.length
          ? "Encontrei estas opções no catálogo demonstrativo. Confira as características antes de escolher."
          : "Não encontrei uma correspondência segura. Tente informar o uso, material ou medida; você também pode solicitar ajuda da equipe.";
        let question = "";
        const ctx = normalize(context);
        if (/tapar|fechar|tampao/.test(ctx) && !/(25|50)/.test(ctx)) {
          question = "Qual é o diâmetro: 25 mm (água fria) ou 50 mm (esgoto)?";
          reply =
            "A peça para fechar a ponta de um tubo é chamada de tampão de PVC.";
        }
        if (/chuveiro/.test(ctx) && !/(127|220)/.test(ctx))
          question =
            "A instalação é de 127 V ou 220 V? Confirme com um eletricista.";
        if (/pintar|pintura|parede/.test(ctx) && !/\d+\s*m/.test(ctx))
          question = "Qual é a área aproximada da parede em m²?";
        let estimate = "";
        const area = ctx.match(/(\d+(?:[.,]\d+)?)\s*m/);
        if (area && /pintar|pintura|parede/.test(ctx)) {
          const n = Number(area[1].replace(",", "."));
          estimate = `Estimativa demonstrativa para ${n} m²: ${Math.ceil(n / 20)} embalagem(ns) de 3,6 L, considerando 20 m² por embalagem em duas demãos. Valide o rendimento no rótulo real.`;
          found = products.filter((p) => p.category === "Pintura");
        }
        await event(user.id, "search", {
          query,
          store,
          count: found.length,
          latency: Date.now() - start,
          mode: "demo",
        });
        return Response.json({
          products: found,
          reply,
          question,
          estimate,
          mode: "demo",
          safety: found.some((p) => p.category === "Elétrica")
            ? "Instalações elétricas devem ser avaliadas por profissional qualificado. Não trabalhe com circuitos energizados."
            : "",
        });
      }
      case "list": {
        const items = z
          .array(
            z.object({
              id: z.string().refine((id) => products.some((p) => p.id === id)),
              quantity: z.number().int().min(1).max(999),
              checked: z.boolean(),
            }),
          )
          .max(100)
          .parse(body.items);
        if (new Set(items.map((x) => x.id)).size !== items.length)
          return Response.json({ error: "Itens repetidos." }, { status: 400 });
        await saveRecord("list:" + user.id, user.id, "list", items);
        return Response.json({ ok: true });
      }
      case "event": {
        const type = z
          .enum([
            "product_view",
            "route_start",
            "route_complete",
            "route_recalculate",
            "photo_demo",
            "kiosk_start",
            "share_route",
            "camera_guide",
          ])
          .parse(body.type);
        const data = z
          .object({
            store: z.string().optional(),
            productId: z.string().optional(),
            duration: z.number().min(0).max(86400000).optional(),
            count: z.number().optional(),
          })
          .parse(body.data || {});
        await event(user.id, type, data);
        return Response.json({ ok: true });
      }
      case "feedback": {
        const data = z
          .object({
            rating: z.number().int().min(1).max(5),
            found: z.boolean(),
            kind: z.enum(["assistant", "route"]),
            comment: z.string().max(600),
            store: z.string().refine(validStore),
          })
          .parse(body.data);
        await saveRecord(crypto.randomUUID(), user.id, "feedback", data);
        return Response.json({ ok: true });
      }
      case "ticket": {
        const data = z
          .object({
            store: z.string().refine(validStore),
            message: z.string().min(3).max(600),
            location: z.string().max(100),
          })
          .parse(body.data);
        const id = crypto.randomUUID();
        await saveRecord(id, user.id, "ticket", {
          ...data,
          status: "Aberto",
          demo: true,
        });
        return Response.json({ ok: true, id });
      }
      case "privacy-delete": {
        await deleteUserData(user.id);
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (e) {
    return error(e);
  }
}
