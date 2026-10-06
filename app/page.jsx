"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Search,
  MapPin,
  Map as MapIcon,
  ClipboardList,
  Headphones,
  Camera,
  ScanLine,
  Mic,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  Monitor,
  QrCode,
  Navigation,
  Star,
  BookOpen,
  Download,
  LocateFixed,
  Pause,
  Info,
  X,
} from "lucide-react";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import QRCode from "qrcode";
import { listKey, readBrowserList, saveBrowserList } from "@/lib/browser-list";
import {
  seedProducts,
  seedConfig,
  stores,
  money,
  optimizeRoute,
  shortestPath,
  searchProducts,
} from "@/lib/domain";
import {
  api,
  ProductCard,
  StoreMap,
  LocationSummary,
  StoreDirectory,
  CategoryIcon,
} from "@/components/merlin/shared";
import { download } from "@/components/merlin/shared";
const navItems = [
  { id: "assistant", title: "Assistente", icon: Sparkles },
  { id: "catalog", title: "Explorar produtos", icon: Search },
  { id: "map", title: "Mapa da loja", icon: MapIcon },
  { id: "list", title: "Minha lista", icon: ClipboardList },
  { id: "tutorials", title: "Projetos e tutoriais", icon: BookOpen },
];
export default function Home() {
  const [view, setView] = useState("assistant"),
    [products, setProducts] = useState(seedProducts),
    [config, setConfig] = useState(seedConfig),
    [store, setStore] = useState("salvador"),
    [ready, setReady] = useState(false),
    [storage, setStorage] = useState("server"),
    [loadError, setLoadError] = useState(""),
    [busy, setBusy] = useState(false),
    [savingList, setSavingList] = useState(false);
  const [q, setQ] = useState(""),
    [mode, setMode] = useState("text"),
    [answers, setAnswers] = useState([]),
    [category, setCategory] = useState("Todos"),
    [catalogQ, setCatalogQ] = useState(""),
    [availableOnly, setAvailableOnly] = useState(false),
    [list, setList] = useState([]),
    [detail, setDetail] = useState(null),
    [dialog, setDialog] = useState(""),
    [kiosk, setKiosk] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 10 }),
    [routeIds, setRouteIds] = useState([]),
    [routeStarted, setRouteStarted] = useState(null),
    [routeProgress, setRouteProgress] = useState(0),
    [qr, setQr] = useState(""),
    [shareUrl, setShareUrl] = useState("");
  const [photo, setPhoto] = useState(""),
    [photoConsent, setPhotoConsent] = useState(false),
    [photoCategory, setPhotoCategory] = useState("Hidráulica"),
    [rating, setRating] = useState(0),
    [found, setFound] = useState(true),
    [comment, setComment] = useState(""),
    [feedbackKind, setFeedbackKind] = useState("assistant"),
    [helpMessage, setHelpMessage] = useState(""),
    [helpLocation, setHelpLocation] = useState("Entrada"),
    [ticketId, setTicketId] = useState("");
  const videoRef = useRef(null),
    streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false),
    [cameraConsent, setCameraConsent] = useState(false);
  const [tutorial, setTutorial] = useState(null);
  const reload = useCallback(async () => {
    const r = await fetch("/api/merlin");
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setProducts(d.products);
    setConfig(d.config);
    setStorage(d.storage);
    // Uma lista local existente continua local até ser excluída pelo usuário.
    const saved = readBrowserList(localStorage, d.products);
    if (saved !== null) {
      setList(saved);
      setStorage("browser");
    } else {
      setList(d.list);
    }
    setReady(true);
    setLoadError("");
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      reload().catch((e) => setLoadError(e.message));
      const params = new URLSearchParams(location.search);
      if (stores.some((s) => s.id === params.get("store")))
        setStore(params.get("store"));
      const ids = params.get("route")?.split(",").slice(0, 10);
      if (ids?.length) {
        setRouteIds(ids);
        setView("map");
      }
      if (params.get("kiosk") === "1") setKiosk(true);
    });
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [reload]);
  const track = async (type, data = {}) => {
    try {
      await api("event", { type, data: { store, ...data } });
    } catch {
      toast.error("Não foi possível salvar o registro desta interação.");
    }
  };
  const go = (v) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const runSearch = async (text = q) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const result = await api("search", {
        query: text.trim(),
        store,
        history: answers.slice(-4).map((a) => a.query),
      });
      setAnswers((a) => [...a.slice(-6), { ...result, query: text }]);
      setQ("");
      setView("assistant");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const ctx = document.modelContext;
    if (!ctx?.registerTool) return;
    const ctrl = new AbortController();
    try {
      Promise.resolve(
        ctx.registerTool(
          {
            name: "search_merlin_catalog",
            title: "Buscar produtos no Merlin",
            description:
              "Pesquisa o catálogo demonstrativo e mostra resultados no assistente.",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", minLength: 1, maxLength: 500 },
              },
              required: ["query"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            execute: async (input) => {
              if (
                typeof input?.query !== "string" ||
                !input.query.trim() ||
                input.query.length > 500
              )
                throw Error("Consulta inválida");
              const r = await api("search", {
                query: input.query,
                store,
                history: [],
              });
              setAnswers([{ ...r, query: input.query }]);
              setView("assistant");
              return {
                demo: true,
                products: r.products.map((p) => ({
                  sku: p.id,
                  name: p.name,
                  available: p.stock[store] > 0,
                })),
                question: r.question,
              };
            },
          },
          { signal: ctrl.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => ctrl.abort();
  }, [store]);
  async function saveList(items) {
    if (savingList) return;
    setSavingList(true);
    try {
      if (storage === "browser") {
        saveBrowserList(localStorage, items);
      } else {
        await api("list", { items });
      }
      setList(items);
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    } finally {
      setSavingList(false);
    }
  }
  async function add(p) {
    const old = list.find((i) => i.id === p.id);
    if (
      await saveList(
        old
          ? list.map((i) =>
              i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i,
            )
          : [...list, { id: p.id, quantity: 1, checked: false }],
      )
    )
      toast.success(p.name + " adicionado à lista");
  }
  async function addMaterials(ids) {
    const next = [...list];
    ids
      .filter((id) => products.some((p) => p.id === id))
      .forEach((id) => {
        if (!next.some((i) => i.id === id))
          next.push({ id, quantity: 1, checked: false });
      });
    if (await saveList(next))
      toast.success("Materiais adicionados à sua lista");
  }
  function routeFor(items) {
    const eligible = items.filter((p) => p.stock[store] > 0);
    if (!eligible.length) {
      toast.error("Nenhum item disponível para traçar uma rota.");
      return;
    }
    if (eligible.length > 10) {
      toast.error("Selecione até 10 produtos por rota.");
      return;
    }
    try {
      optimizeRoute(start, eligible, config.blocked);
      setRouteIds(eligible.map((p) => p.id));
      setRouteProgress(0);
      setRouteStarted(null);
      setDetail(null);
      go("map");
      if (eligible.length !== items.length)
        toast.info("Itens indisponíveis foram excluídos da rota.");
    } catch (e) {
      toast.error(e.message);
    }
  }
  let route = {
      items: [],
      path: [],
      distance: 0,
    },
    routeError = "";
  try {
    route = optimizeRoute(
      start,
      routeIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p) => !!p && p.stock[store] > 0),
      config.blocked,
    );
  } catch (e) {
    routeError = e.message;
  }
  const openDetail = (p) => {
    setDetail(p);
    track("product_view", { productId: p.id });
  };
  async function share() {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("store", store);
    url.searchParams.set("route", route.items.map((p) => p.id).join(","));
    setShareUrl(url.href);
    setQr(
      await QRCode.toDataURL(url.href, {
        width: 280,
        margin: 2,
        color: { dark: "#075b35", light: "#ffffff" },
      }),
    );
    setDialog("share");
    track("share_route", { count: route.items.length });
  }
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
      track("camera_guide");
    } catch {
      toast.error(
        "Câmera indisponível ou acesso negado. Continue pelo mapa 2D.",
      );
    }
  }
  function closeDialog() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setDialog("");
    setTicketId("");
  }
  function feedback(kind) {
    setFeedbackKind(kind);
    setRating(0);
    setComment("");
    setFound(true);
    setDialog("feedback");
  }
  async function completeRoute(completedAt) {
    if (!routeStarted) return;
    await track("route_complete", {
      duration: completedAt - routeStarted,
      count: route.items.length,
    });
    setRouteStarted(null);
    feedback("route");
  }
  const cards = (items) => (
    <div className="products-grid">
      {items.map((p) => (
        <ProductCard
          key={p.id}
          p={p}
          store={store}
          onDetail={openDetail}
          onRoute={(p) => routeFor([p])}
          onAdd={add}
        />
      ))}
    </div>
  );
  const lastAnswer = answers[answers.length - 1];
  const previewProduct =
    lastAnswer?.products?.[0] ||
    products.find((p) => p.id === "31010001") ||
    seedProducts[6];
  const filtered = searchProducts(products, catalogQ).filter(
    (p) =>
      (category === "Todos" || p.category === category) &&
      (!availableOnly || p.stock[store] > 0),
  );
  return (
    <SidebarProvider className={"app " + (kiosk ? "kiosk" : "")}>
      <Toaster richColors position="bottom-right" />
      <Sidebar collapsible="none" className="sidebar">
        <button
          className="brand"
          onClick={() => go("assistant")}
          aria-label="Merlin AI, início"
        >
          <img src="/merlin-logo.png" alt="" />
          <strong>
            Merlin AI<span>Seu assistente na loja</span>
          </strong>
        </button>
        <nav aria-label="Menu principal">
          {navItems.map(({ id, title, icon: I }) => (
            <button
              className={view === id ? "active" : ""}
              key={id}
              title={title}
              aria-label={title}
              onClick={() => go(id)}
            >
              <I size={20} />
              {title}
              {id === "list" && list.length > 0 && (
                <span className="count">{list.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="help">
            <Headphones size={22} />
            <b>Precisa de uma mão?</b>
            <p>Conte com a equipe da loja.</p>
            <button onClick={() => setDialog("help")}>
              Solicitar atendimento
            </button>
          </div>
        </div>
        <button className="pilot" onClick={() => setDialog("about")}>
          AMBIENTE DEMONSTRATIVO <Info size={12} />
        </button>
      </Sidebar>
      <div className="workspace">
        <header>
          <span>
            {navItems.find((n) => n.id === view)?.title || "Merlin AI"}{" "}
            <span className="muted">
              / {kiosk ? "Modo quiosque" : "Merlin AI"}
            </span>
          </span>
          <div className="header-actions">
            <MapPin size={18} />
            <NativeSelect
              aria-label="Selecione a loja"
              value={store}
              onChange={(e) => {
                setStore(e.target.value);
                setRouteIds([]);
                setRouteStarted(null);
                setAnswers([]);
                setStart({ x: 0, y: 10 });
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
            <button
              className="icon-button"
              title={kiosk ? "Encerrar modo quiosque" : "Modo quiosque"}
              onClick={() => {
                if (kiosk) {
                  setDialog("end-kiosk");
                } else {
                  setKiosk(true);
                  go("assistant");
                  track("kiosk_start");
                }
              }}
            >
              <Monitor size={19} />
            </button>
            <button
              className="icon-button mobile-help"
              title="Solicitar atendimento"
              onClick={() => setDialog("help")}
            >
              <Headphones size={19} />
            </button>
            <button
              className="icon-button"
              title="Privacidade"
              onClick={() => setDialog("privacy")}
            >
              <ShieldCheck size={19} />
            </button>
          </div>
        </header>
        {kiosk && (
          <div className="kiosk-bar">
            Autoatendimento · sessão privada de demonstração{" "}
            <button onClick={() => setDialog("end-kiosk")}>
              Encerrar sessão
            </button>
          </div>
        )}
        <main>
          {loadError && (
            <div className="notice error" role="alert">
              {loadError}{" "}
              
              <button
                onClick={() => reload().catch((e) => setLoadError(e.message))}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {ready && storage === "browser" && (
            <div className="notice" role="status">
              Sua lista será salva neste navegador. Busca e rotas estão disponíveis.
            </div>
          )}
          {!ready && !loadError && (
            <div className="notice" role="status">
              Carregando seus dados…
            </div>
          )}
          {view === "assistant" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">MENOS PROCURA. MAIS PROJETO.</div>
                <h1>O que vamos encontrar hoje?</h1>
                <p>
                  Descreva do seu jeito. O Merlin ajuda você a chegar ao produto
                  certo.
                </p>
              </div>
              <div className="home-grid">
                <section>
                  <div className="search-panel">
                    <Tabs value={mode} onValueChange={setMode}>
                      <TabsList className="search-tabs">
                        <TabsTrigger value="text">
                          <Sparkles size={18} /> Descrever
                        </TabsTrigger>
                        <TabsTrigger value="photo">
                          <Camera size={18} /> Enviar foto
                        </TabsTrigger>
                        <TabsTrigger value="code">
                          <ScanLine size={18} /> Código
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="text">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            runSearch();
                          }}
                        >
                          <textarea
                            maxLength={500}
                            aria-label="Descreva o que precisa"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Ex.: preciso de uma peça para tapar um cano..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                runSearch();
                              }
                            }}
                          />
                          <div className="search-bottom">
                            <span>Não precisa saber o nome técnico.</span>
                            <button
                              type="button"
                              className="icon-button"
                              aria-label="Ditar busca por voz"
                              onClick={() => {
                                const R =
                                  window.SpeechRecognition ||
                                  window.webkitSpeechRecognition;
                                if (!R) {
                                  toast.info(
                                    "Ditado não suportado neste navegador. Digite sua busca.",
                                  );
                                  return;
                                }
                                const r = new R();
                                r.lang = "pt-BR";
                                r.onresult = (e) =>
                                  setQ(e.results[0][0].transcript);
                                r.onerror = () =>
                                  toast.error(
                                    "Não foi possível ouvir. Tente digitar.",
                                  );
                                r.start();
                                toast.info("Ouvindo…");
                              }}
                            >
                              <Mic size={18} />
                            </button>
                            <button
                              disabled={busy || !ready || !q.trim()}
                              className="primary"
                            >
                              <Search size={18} />
                              {busy ? "Buscando…" : "Encontrar produto"}
                            </button>
                          </div>
                        </form>
                      </TabsContent>
                      <TabsContent value="photo">
                        <div className="photo-form">
                          <h3>Uma foto ajuda a explicar</h3>
                          <p>
                            Neste piloto, a foto serve como referência visual
                            para você. A identificação automática por IA ainda
                            não está conectada.
                          </p>
                          <label className="check-label">
                            <Checkbox
                              checked={photoConsent}
                              onCheckedChange={(v) => {
                                setPhotoConsent(!!v);
                                if (!v) setPhoto("");
                              }}
                            />{" "}
                            Concordo em abrir a foto neste navegador. Ela não
                            será enviada ou armazenada.
                          </label>
                          <input
                            aria-label="Escolher foto da peça"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            disabled={!photoConsent}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (f.size > 8 * 1024 * 1024) {
                                toast.error("Escolha uma imagem de até 8 MB");
                                return;
                              }
                              if (
                                ![
                                  "image/jpeg",
                                  "image/png",
                                  "image/webp",
                                ].includes(f.type)
                              ) {
                                toast.error("Use JPG, PNG ou WebP.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = () =>
                                setPhoto(String(reader.result));
                              reader.readAsDataURL(f);
                            }}
                          />
                          {photo && (
                            <>
                              <img
                                className="photo-preview"
                                src={photo}
                                alt="Foto escolhida, visível apenas neste navegador"
                              />
                              <label>
                                Para simular a etapa seguinte, escolha o setor
                                <NativeSelect
                                  value={photoCategory}
                                  onChange={(e) =>
                                    setPhotoCategory(e.target.value)
                                  }
                                >
                                  {["Hidráulica", "Elétrica", "Pintura"].map(
                                    (s) => (
                                      <option key={s}>{s}</option>
                                    ),
                                  )}
                                </NativeSelect>
                              </label>
                              <button
                                className="primary"
                                onClick={() => {
                                  setCategory(photoCategory);
                                  setCatalogQ("");
                                  go("catalog");
                                  track("photo_demo");
                                }}
                              >
                                Explorar produtos desse setor
                              </button>
                              <button
                                className="text-button"
                                onClick={() => setPhoto("")}
                              >
                                Remover foto
                              </button>
                            </>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="code">
                        <form
                          className="photo-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            runSearch();
                            setMode("text");
                          }}
                        >
                          <label>
                            Digite ou escaneie o SKU
                            <input
                              aria-label="Código do produto"
                              value={q}
                              onChange={(e) => setQ(e.target.value)}
                              placeholder="Ex.: 26050350"
                              autoComplete="off"
                            />
                          </label>
                          <p>
                            Leitores USB funcionam como teclado. No celular, use
                            a entrada de código.
                          </p>
                          <button
                            className="primary"
                            disabled={!q || busy || !ready}
                          >
                            <ScanLine size={18} /> Buscar código
                          </button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </div>
                  {mode === "text" && (
                    <div className="suggestions">
                      <span>Experimente</span>
                      {[
                        "Tapar um cano",
                        "Pintar uma parede",
                        "Instalar uma tomada",
                      ].map((s) => (
                        <button
                          onClick={() => runSearch(s)}
                          disabled={busy || !ready}
                          key={s}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {lastAnswer ? (
                    <section className="answer-section" aria-live="polite">
                      <div className="answer-header">
                        <img src="/merlin-logo.png" alt="" />
                        <div>
                          <span className="eyebrow">
                            MERLIN · BUSCA DEMONSTRATIVA
                          </span>
                          <h2>Vamos encontrar a melhor opção</h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => {
                            setAnswers([]);
                            setQ("");
                          }}
                        >
                          Nova conversa
                        </button>
                      </div>
                      <div className="conversation">
                        {answers.map((a, i) => (
                          <div key={i}>
                            <div className="user-message">{a.query}</div>
                            <p>{a.reply}</p>
                            {a.question && (
                              <p className="clarification">{a.question}</p>
                            )}
                            {a.estimate && (
                              <div className="notice">{a.estimate}</div>
                            )}
                          </div>
                        ))}
                      </div>
                      {lastAnswer.safety && (
                        <div className="notice amber">{lastAnswer.safety}</div>
                      )}
                      {cards(lastAnswer.products)}
                      {!lastAnswer.products.length && (
                        <button
                          className="outline"
                          onClick={() => setDialog("help")}
                        >
                          Solicitar ajuda da equipe
                        </button>
                      )}
                      <button
                        className="text-button spaced"
                        onClick={() => feedback("assistant")}
                      >
                        <Star size={16} /> Avaliar esta resposta
                      </button>
                    </section>
                  ) : (
                    <>
                      <div className="section-title">
                        <h2>Por onde seu projeto começa?</h2>
                        <span>Explore os setores</span>
                      </div>
                      <div className="categories">
                        {["Hidráulica", "Elétrica", "Pintura"].map((t, i) => (
                          <button
                            key={t}
                            onClick={() => {
                              setCategory(t);
                              setCatalogQ("");
                              go("catalog");
                            }}
                          >
                            <span className="category-icon">
                              <CategoryIcon category={t} />
                            </span>
                            <b>{t}</b>
                            <p>
                              {
                                [
                                  "Tubos, conexões e reparos",
                                  "Tomadas, fios e iluminação",
                                  "Tintas e acabamentos",
                                ][i]
                              }
                            </p>
                            <ChevronRight size={18} />
                          </button>
                        ))}
                      </div>
                      <div className="merlin-note">
                        <img src="/merlin-logo.png" alt="Merlin" />
                        <div>
                          <b>Uma ideia na cabeça. Tudo à mão.</b>
                          <p>
                            Encontre o produto, confira onde ele está e crie uma
                            rota pela loja.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </section>
                <aside className="right-panel">
                  <LocationSummary
                    product={previewProduct}
                    disabled={!ready || previewProduct.stock[store] <= 0}
                    onRoute={(p) => routeFor([p])}
                  />
                  <p className="map-product-name">{previewProduct.name}</p>
                  <StoreMap
                    start={start}
                    path={shortestPath(start, previewProduct, config.blocked)}
                    targets={[previewProduct]}
                    blocked={config.blocked}
                    mini
                  />
                  <div className="map-caption">
                    <MapPin size={18} />
                    <span>
                      A rota termina ao lado da gôndola. Confira módulo e
                      prateleira ao chegar.
                    </span>
                  </div>
                  <button className="outline full" onClick={() => go("map")}>
                    <MapIcon size={18} /> Explorar mapa da loja
                  </button>
                  <div className="demo-note">
                    <b>Conheça a loja piloto</b>
                    <p>
                      Catálogo, preços, estoque e planta fictícios para explorar
                      a experiência.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setDialog("about")}
                    >
                      O que está em demonstração?
                    </button>
                  </div>
                </aside>
              </div>
            </>
          )}
          {view === "catalog" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">CATÁLOGO DEMONSTRATIVO</div>
                <h1>Encontre o próximo passo do seu projeto</h1>
                <p>
                  Produtos e valores fictícios · estoque por loja selecionada.
                </p>
              </div>
              <div className="toolbar">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="Buscar no catálogo"
                    placeholder="Nome, SKU ou necessidade"
                    value={catalogQ}
                    onChange={(e) => setCatalogQ(e.target.value)}
                  />
                </label>
                <NativeSelect
                  aria-label="Filtrar setor"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {["Todos", "Hidráulica", "Elétrica", "Pintura"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </NativeSelect>
                <label className="check-label">
                  <Checkbox
                    checked={availableOnly}
                    onCheckedChange={(v) => setAvailableOnly(!!v)}
                  />{" "}
                  Somente disponíveis
                </label>
              </div>
              <p className="result-count">{filtered.length} produtos</p>
              {filtered.length ? (
                cards(filtered)
              ) : (
                <div className="empty">
                  <Search />
                  <h2>Nenhum produto encontrado</h2>
                  <p>Tente outra descrição ou remova os filtros.</p>
                  <button
                    className="outline"
                    onClick={() => {
                      setCategory("Todos");
                      setCatalogQ("");
                      setAvailableOnly(false);
                    }}
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </>
          )}
          {view === "map" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">NAVEGAÇÃO NA LOJA</div>
                <h1>
                  {route.items.length
                    ? "Seu caminho até o produto"
                    : "Conheça o mapa da loja"}
                </h1>
                <p>
                  Planta demonstrativa · posição definida manualmente, sem
                  rastreamento automático.
                </p>
              </div>
              <div className="map-layout">
                <section className="panel">
                  <div className="toolbar">
                    <label>
                      Ponto de partida
                      <NativeSelect
                        value={`${start.x},${start.y}`}
                        onChange={(e) => {
                          const [x, y] = e.target.value.split(",").map(Number);
                          setStart({ x, y });
                          setRouteProgress(0);
                          if (routeStarted) track("route_recalculate");
                        }}
                      >
                        <option value="0,10">Entrada</option>
                        <option value="12,5">Balcão de atendimento</option>
                        <option value="11,10">Caixas</option>
                        {!["0,10", "12,5", "11,10"].includes(
                          `${start.x},${start.y}`,
                        ) && (
                          <option value={`${start.x},${start.y}`}>
                            Posição no mapa ({start.x}, {start.y})
                          </option>
                        )}
                      </NativeSelect>
                    </label>
                    <button
                      className="text-button"
                      onClick={() =>
                        toast.info(
                          "Toque em um corredor livre no mapa para atualizar sua posição.",
                        )
                      }
                    >
                      <LocateFixed size={17} /> Ajustar posição
                    </button>
                  </div>
                  <StoreMap
                    start={start}
                    path={route.path}
                    targets={route.items}
                    blocked={config.blocked}
                    onPoint={(p) => {
                      if (
                        config.blocked.some((b) => b.x === p.x && b.y === p.y)
                      ) {
                        toast.error("Este ponto está bloqueado");
                        return;
                      }
                      setStart(p);
                      setRouteProgress(0);
                      if (routeStarted) track("route_recalculate");
                    }}
                  />
                  <StoreDirectory />
                  <div className="map-legend">
                    <span>
                      <i className="green" /> Posição informada
                    </span>
                    <span>
                      <i className="yellow" /> Produto
                    </span>
                    <span>Escala ilustrativa · 2 m por célula</span>
                  </div>
                </section>
                <section className="panel route-panel">
                  {routeError ? (
                    <div className="notice error">{routeError}</div>
                  ) : route.items.length ? (
                    <>
                      <span className="badge">ROTA CALCULADA</span>
                      <h2>
                        {route.items.length} parada
                        {route.items.length > 1 ? "s" : ""}, um só caminho
                      </h2>
                      <p>
                        {route.distance} m estimados · aproximadamente{" "}
                        {Math.max(1, Math.ceil(route.distance / 50))} min
                      </p>
                      <div className="route-stops">
                        {route.items.map((p, i) => (
                          <div
                            key={p.id}
                            className={i < routeProgress ? "done" : ""}
                          >
                            <span>
                              {i < routeProgress ? <Check size={17} /> : i + 1}
                            </span>
                            <div>
                              <b>{p.name}</b>
                              <p>
                                Corredor {p.aisle} · Gôndola {p.bay}
                                <br />
                                Módulo {p.module} · {p.side}
                                <br />
                                Prateleira {p.shelf}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {!routeStarted ? (
                        <button
                          className="primary full"
                          onClick={() => {
                            setRouteStarted(Date.now());
                            setRouteProgress(0);
                            track("route_start", { count: route.items.length });
                          }}
                        >
                          <Navigation size={18} /> Iniciar rota
                        </button>
                      ) : (
                        <>
                          <div className="notice">
                            {routeProgress < route.items.length
                              ? `Próxima parada: ${route.items[routeProgress].name}`
                              : "Todos os pontos confirmados."}
                          </div>
                          {routeProgress < route.items.length && (
                            <button
                              className="primary full"
                              onClick={() => setRouteProgress((i) => i + 1)}
                            >
                              Confirmar chegada à parada {routeProgress + 1}
                            </button>
                          )}
                          {routeProgress === route.items.length && (
                            <button
                              className="primary full"
                              onClick={() => completeRoute(Date.now())}
                            >
                              Concluir rota e avaliar
                            </button>
                          )}
                          <button
                            className="text-button full"
                            onClick={() => setRouteStarted(null)}
                          >
                            <Pause size={16} /> Encerrar orientação
                          </button>
                        </>
                      )}
                      <div className="actions spaced">
                        <button className="outline" onClick={share}>
                          <QrCode size={17} /> Continuar no celular
                        </button>
                        <button
                          className="outline"
                          onClick={() => {
                            setCameraConsent(false);
                            setDialog("camera");
                          }}
                        >
                          <Camera size={17} /> Guia pela câmera
                        </button>
                      </div>
                      <button
                        className="text-button spaced"
                        onClick={() => {
                          setRouteIds([]);
                          setRouteStarted(null);
                        }}
                      >
                        Limpar rota
                      </button>
                    </>
                  ) : (
                    <div className="empty">
                      <MapPin size={32} />
                      <h2>Para onde vamos?</h2>
                      <p>
                        Escolha um produto no catálogo ou crie uma rota com sua
                        lista.
                      </p>
                      <button className="primary" onClick={() => go("catalog")}>
                        Escolher produto
                      </button>
                      <button className="outline" onClick={() => go("list")}>
                        Abrir minha lista
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          {view === "list" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">SEU PROJETO, ORGANIZADO</div>
                <h1>Minha lista</h1>
                <p>
                  Seus itens ficam salvos nesta conta para a próxima visita.
                </p>
              </div>
              {!list.length ? (
                <div className="empty panel">
                  <ClipboardList size={38} />
                  <h2>Seu projeto começa com o primeiro item</h2>
                  <p>Adicione produtos ou os materiais de um tutorial.</p>
                  <button className="primary" onClick={() => go("catalog")}>
                    Explorar produtos
                  </button>
                </div>
              ) : (
                <div className="map-layout">
                  <section className="panel list-panel">
                    {list.map((item) => {
                      const p = products.find((p) => p.id === item.id);
                      return (
                        <div
                          className={
                            "list-row " + (item.checked ? "checked" : "")
                          }
                          key={item.id}
                        >
                          <Checkbox
                            aria-label={
                              "Marcar " +
                              (p?.name || item.id) +
                              " como encontrado"
                            }
                            checked={item.checked}
                            disabled={savingList}
                            onCheckedChange={(v) =>
                              saveList(
                                list.map((i) =>
                                  i.id === item.id ? { ...i, checked: !!v } : i,
                                ),
                              )
                            }
                          />
                          <div className="list-product">
                            <b>{p?.name || "Produto removido do catálogo"}</b>
                            <small>
                              {p
                                ? `Corredor ${p.aisle} · ${p.stock[store] > 0 ? "Disponível (demo)" : "Indisponível nesta loja"}`
                                : item.id}
                            </small>
                          </div>
                          <input
                            className="quantity"
                            aria-label={"Quantidade de " + (p?.name || item.id)}
                            type="number"
                            min="1"
                            max="999"
                            disabled={savingList}
                            value={item.quantity}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              if (n >= 1 && n <= 999)
                                saveList(
                                  list.map((i) =>
                                    i.id === item.id
                                      ? { ...i, quantity: n }
                                      : i,
                                  ),
                                );
                            }}
                          />
                          <strong>
                            {p ? money(p.price * item.quantity) : "—"}
                          </strong>
                          <button
                            aria-label={"Remover " + (p?.name || item.id)}
                            disabled={savingList}
                            onClick={() =>
                              saveList(list.filter((i) => i.id !== item.id))
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      );
                    })}
                  </section>
                  <section className="panel route-panel">
                    <h2>Tudo para o seu projeto</h2>
                    <p>
                      {list.length} produtos ·{" "}
                      {list.filter((i) => i.checked).length} encontrados
                    </p>
                    <span>Total estimado</span>
                    <strong className="total">
                      {money(
                        list.reduce(
                          (sum, i) =>
                            sum +
                            (products.find((p) => p.id === i.id)?.price || 0) *
                              i.quantity,
                          0,
                        ),
                      )}
                    </strong>
                    <p>Preços demonstrativos. Pagamento nos caixas da loja.</p>
                    <button
                      className="primary full"
                      onClick={() =>
                        routeFor(
                          list
                            .filter((i) => !i.checked)
                            .map((i) => products.find((p) => p.id === i.id))
                            .filter((p) => !!p),
                        )
                      }
                    >
                      <Navigation size={18} /> Criar rota dos itens pendentes
                    </button>
                    <button
                      className="outline full spaced"
                      onClick={() =>
                        download(
                          "minha-lista-merlin.json",
                          list.map((i) => ({
                            ...i,
                            product: products.find((p) => p.id === i.id),
                          })),
                        )
                      }
                    >
                      <Download size={17} /> Exportar lista
                    </button>
                    <button
                      className="text-button danger spaced"
                      onClick={() => setDialog("clear-list")}
                    >
                      Limpar lista
                    </button>
                  </section>
                </div>
              )}
            </>
          )}
          {view === "tutorials" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">FAÇA COM MAIS CONFIANÇA</div>
                <h1>Projetos e tutoriais</h1>
                <p>
                  Planeje os materiais e saiba quando contar com um
                  profissional.
                </p>
              </div>
              <div className="tutorial-grid">
                {config.tutorials.map((t) => (
                  <article className="panel tutorial-card" key={t.id}>
                    <div className="tutorial-icon">
                      <CategoryIcon category={t.category} size={34} />
                    </div>
                    <span className="eyebrow">{t.category}</span>
                    <h2>{t.title}</h2>
                    <p>
                      {t.steps.length} etapas · {t.products.length} materiais
                      sugeridos
                    </p>
                    <button className="outline" onClick={() => setTutorial(t)}>
                      Ver orientações
                    </button>
                  </article>
                ))}
              </div>
              <section className="panel spaced">
                <h2>Perguntas frequentes</h2>
                {config.faqs.map((f, i) => (
                  <details key={i}>
                    <summary>{f.question}</summary>
                    <p>{f.answer}</p>
                  </details>
                ))}
              </section>
            </>
          )}
        </main>
        <footer>
          <b>Merlin AI</b>
          <span>Um pouco de magia. Muito mais autonomia.</span>
          <button onClick={() => setDialog("about")}>
            Projeto acadêmico · Challenge 2026
          </button>
        </footer>
      </div>
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent
          showCloseButton={false}
          className="merlin-dialog wide-dialog"
        >
          <DialogClose className="modal-close" aria-label="Fechar">
            <X size={20} />
          </DialogClose>
          <DialogTitle>{detail?.name}</DialogTitle>
          <DialogDescription>
            {detail?.brand} · SKU {detail?.id} · Catálogo demonstrativo
          </DialogDescription>
          {detail && (
            <>
              <div className="detail-summary">
                <span className="detail-icon">
                  <CategoryIcon category={detail.category} size={50} />
                </span>
                <div>
                  <strong className="price">{money(detail.price)}</strong>
                  <p>{detail.attributes}</p>
                  <span
                    className={
                      "badge " + (detail.stock[store] > 0 ? "" : "amber")
                    }
                  >
                    {detail.stock[store] > 0
                      ? `${detail.stock[store]} unidades (demo)`
                      : "Indisponível nesta loja"}
                  </span>
                </div>
              </div>
              <p>{detail.description}</p>
              <LocationSummary
                product={detail}
                disabled={detail.stock[store] === 0}
                onRoute={(p) => routeFor([p])}
              />
              <StoreMap
                start={start}
                path={shortestPath(start, detail, config.blocked)}
                targets={[detail]}
                blocked={config.blocked}
                mini
              />
              {detail.stock[store] === 0 && (
                <div className="notice amber">
                  <div>
                    Este item está indisponível.{" "}
                    {stores
                      .filter((s) => s.id !== store && detail.stock[s.id] > 0)
                      .map((s) => (
                        <button
                          key={s.id}
                          className="text-button"
                          onClick={() => {
                            setStore(s.id);
                            setRouteIds([]);
                            setRouteStarted(null);
                            setAnswers([]);
                            setStart({ x: 0, y: 10 });
                            toast.info("Loja alterada");
                          }}
                        >
                          Consultar {s.name} ({detail.stock[s.id]} un. demo)
                        </button>
                      ))}
                  </div>
                </div>
              )}
              <div className="actions">
                <button
                  disabled={detail.stock[store] === 0}
                  className="primary"
                  onClick={() => routeFor([detail])}
                >
                  <Navigation size={17} /> Encontrar na loja
                </button>
                <button
                  className="outline"
                  disabled={savingList}
                  onClick={() => add(detail)}
                >
                  <Plus size={17} /> Adicionar à lista
                </button>
              </div>
              <h3 className="spaced">
                {detail.stock[store] === 0
                  ? "Alternativas disponíveis"
                  : "Você também pode precisar"}
              </h3>
              <div className="related-products">
                {products
                  .filter(
                    (p) =>
                      p.id !== detail.id &&
                      p.stock[store] > 0 &&
                      (detail.stock[store] === 0
                        ? p.category === detail.category
                        : detail.related.includes(p.id)),
                  )
                  .slice(0, 4)
                  .map((p) => (
                    <button key={p.id} onClick={() => setDetail(p)}>
                      <CategoryIcon category={p.category} size={20} />
                      <div>
                        <b>{p.name}</b>
                        <span>{money(p.price)}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!tutorial} onOpenChange={(v) => !v && setTutorial(null)}>
        <DialogContent showCloseButton={false} className="merlin-dialog">
          <DialogClose className="modal-close" aria-label="Fechar">
            <X size={20} />
          </DialogClose>
          <DialogTitle>{tutorial?.title}</DialogTitle>
          <DialogDescription>
            Orientações de planejamento. Siga as especificações dos produtos
            reais.
          </DialogDescription>
          <ol className="tutorial-steps">
            {tutorial?.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="notice amber">{tutorial?.safety}</div>
          <button
            className="primary"
            disabled={savingList}
            onClick={() => tutorial && addMaterials(tutorial.products)}
          >
            Adicionar materiais à lista
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!dialog} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent
          showCloseButton={false}
          className={
            "merlin-dialog " + (dialog === "camera" ? "wide-dialog" : "")
          }
        >
          <DialogClose className="modal-close" aria-label="Fechar">
            <X size={20} />
          </DialogClose>
          <DialogTitle>
            {
              {
                help: "Atendimento da equipe",
                feedback: "Como foi sua experiência?",
                share: "Continue no celular",
                privacy: "Sua privacidade",
                about: "Sobre esta demonstração",
                camera: "Guia pela câmera",
                "clear-list": "Limpar sua lista?",
                "end-kiosk": "Encerrar sessão do quiosque?",
              }[dialog]
            }
          </DialogTitle>
          <DialogDescription>
            {
              {
                help: "Seu pedido será salvo como parte da demonstração. Nenhum vendedor será notificado.",
                feedback:
                  "Sua avaliação ajuda a melhorar o assistente e a navegação.",
                share: "Escaneie o QR Code para abrir esta rota na mesma loja.",
                privacy: "Você controla os dados da sua visita.",
                about: "Merlin AI · Projeto acadêmico Challenge 2026",
                camera:
                  "Orientação visual manual. As instruções não ficam ancoradas no ambiente físico.",
                "clear-list":
                  "Todos os itens serão removidos da sua lista salva.",
                "end-kiosk":
                  "A conversa e a foto serão descartadas. A lista permanece na sua conta.",
              }[dialog]
            }
          </DialogDescription>
          {dialog === "help" &&
            (ticketId ? (
              <div className="success-state">
                <Check size={32} />
                <h2>Chamado registrado</h2>
                <p>Protocolo #{ticketId.slice(0, 6)}</p>
                <p>
                  Seu pedido foi salvo neste protótipo. Nenhum vendedor foi
                  notificado. Em uma loja real, dirija-se ao balcão.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    closeDialog();
                    setRouteIds([]);
                    setRouteStarted(null);
                    go("map");
                  }}
                >
                  Ver balcão no mapa
                </button>
              </div>
            ) : (
              <form
                className="edit-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    const d = await api("ticket", {
                      data: {
                        store,
                        message: helpMessage,
                        location: helpLocation,
                      },
                    });
                    setTicketId(d.id);
                    setHelpMessage("");
                  } catch (e) {
                    toast.error(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Onde você está?
                  <input
                    value={helpLocation}
                    maxLength={100}
                    onChange={(e) => setHelpLocation(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Como podemos ajudar?
                  <textarea
                    required
                    minLength={3}
                    maxLength={600}
                    value={helpMessage}
                    onChange={(e) => setHelpMessage(e.target.value)}
                    placeholder="Conte qual produto ou orientação você procura."
                  />
                </label>
                <button className="primary" disabled={busy || !ready}>
                  Registrar chamado demonstrativo
                </button>
              </form>
            ))}
          {dialog === "feedback" && (
            <form
              className="edit-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!rating) return;
                setBusy(true);
                try {
                  await api("feedback", {
                    data: { rating, found, kind: feedbackKind, comment, store },
                  });
                  closeDialog();
                  toast.success("Obrigado! Sua avaliação foi salva.");
                } catch (e) {
                  toast.error(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div
                className="stars"
                role="group"
                aria-label="Avaliação de 1 a 5"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                    aria-pressed={rating === n}
                    onClick={() => setRating(n)}
                  >
                    <Star
                      fill={n <= rating ? "#e7b83e" : "none"}
                      color={n <= rating ? "#b78a19" : "#9ba89c"}
                      size={32}
                    />
                  </button>
                ))}
              </div>
              <label className="check-label">
                <Checkbox
                  checked={found}
                  onCheckedChange={(v) => setFound(!!v)}
                />{" "}
                Encontrei o produto que precisava
              </label>
              <label>
                Comentário (opcional)
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={600}
                />
              </label>
              <button className="primary" disabled={!rating || busy}>
                Enviar avaliação
              </button>
            </form>
          )}
          {dialog === "share" && (
            <div className="share-content">
              {qr && <img src={qr} alt="QR Code da rota selecionada" />}
              <p>
                Acesso privado: use sua conta autorizada também no celular. Em
                prévia local, o endereço só abre neste computador; após a
                publicação, o QR usa o endereço do site.
              </p>
              <input readOnly aria-label="Link da rota" value={shareUrl} />
              <button
                className="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success("Link copiado");
                  } catch {
                    toast.info("Selecione e copie o link acima");
                  }
                }}
              >
                Copiar link
              </button>
            </div>
          )}
          {dialog === "privacy" && (
            <>
              <p>
                As fotos ficam apenas na memória desta página e não são enviadas
                ao servidor. Fechar a página descarta a imagem.
              </p>
              <p>
                A câmera só é aberta com sua autorização. A posição é informada
                manualmente; não coletamos GPS, BLE ou Wi-Fi.
              </p>
              <p>
                A lista, buscas, avaliações e chamados são associados a este
                navegador. Os eventos não pedem nome, telefone ou e-mail. Evite
                inserir dados pessoais nas mensagens.
              </p>
              <p>
                Neste piloto, os dados permanecem até sua exclusão manual. Uma
                política automática de retenção precisa ser definida para a
                operação real.
              </p>
              <button
                className="outline danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    localStorage.removeItem(listKey);
                    setList([]);
                    await api("privacy-delete");
                    setList([]);
                    setAnswers([]);
                    setPhoto("");
                    closeDialog();
                    toast.success(
                      "Lista local e registros desta demonstração excluídos.",
                    );
                  } catch (e) {
                    toast.error(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Excluir meus dados desta demonstração
              </button>
            </>
          )}
          {dialog === "about" && (
            <>
              <p>
                Esta aplicação web implementa os fluxos do escopo com catálogo,
                preços, estoque e planta demonstrativos. Não é um serviço
                oficial da Leroy Merlin.
              </p>
              <ul className="plain-list">
                <li>
                  Busca por termos e sinônimos, com perguntas de refinamento
                  predefinidas.
                </li>
                <li>
                  Foto como referência local; reconhecimento por IA ainda não
                  conectado.
                </li>
                <li>
                  Rotas calculadas sobre o mapa; posição manual e guia por
                  câmera sem RA espacial.
                </li>
                <li>
                  Lista, avaliações e pedidos de ajuda com dados persistentes.
                </li>
              </ul>
              <p>
                As metas de precisão e ganhos de negócio dos documentos ainda
                exigem validação em loja.
              </p>
            </>
          )}
          {dialog === "camera" && (
            <>
              {!cameraActive ? (
                <>
                  <div className="notice amber">
                    Este guia não reconhece corredores nem mede sua posição.
                    Confirme a localização no mapa e observe o ambiente ao
                    caminhar.
                  </div>
                  <label className="check-label">
                    <Checkbox
                      checked={cameraConsent}
                      onCheckedChange={(v) => setCameraConsent(!!v)}
                    />{" "}
                    Permito abrir a câmera para visualizar o guia. Nenhum vídeo
                    será armazenado.
                  </label>
                  <button
                    className="primary"
                    disabled={!cameraConsent}
                    onClick={startCamera}
                  >
                    Abrir câmera
                  </button>
                  <button className="outline" onClick={closeDialog}>
                    Continuar no mapa 2D
                  </button>
                </>
              ) : (
                <>
                  <div className="camera-view">
                    <video ref={videoRef} autoPlay muted playsInline />
                    <div className="camera-overlay">
                      <Navigation size={42} />
                      <b>
                        {route.items[routeProgress]?.name ||
                          "Consulte sua rota no mapa"}
                      </b>
                      <span>
                        {route.items[routeProgress]
                          ? `Corredor ${route.items[routeProgress].aisle} · Gôndola ${route.items[routeProgress].bay} · Prateleira ${route.items[routeProgress].shelf}`
                          : "Sem destino selecionado"}
                      </span>
                      <small>GUIA MANUAL · SEM RASTREAMENTO ESPACIAL</small>
                    </div>
                  </div>
                  <button className="outline" onClick={closeDialog}>
                    Fechar câmera e voltar ao mapa
                  </button>
                </>
              )}
            </>
          )}
          {dialog === "clear-list" && (
            <button
              className="primary"
              disabled={savingList}
              onClick={async () => {
                if (await saveList([])) closeDialog();
              }}
            >
              Confirmar e limpar lista
            </button>
          )}
          {dialog === "end-kiosk" && (
            <>
              <button
                className="primary"
                onClick={() => {
                  setAnswers([]);
                  setQ("");
                  setPhoto("");
                  setRouteIds([]);
                  setRouteStarted(null);
                  setKiosk(false);
                  closeDialog();
                  go("assistant");
                }}
              >
                Encerrar demonstração
              </button>
              <p>
                Para um quiosque público real, é necessário configurar contas de
                dispositivo e sessões isoladas antes da implantação.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
