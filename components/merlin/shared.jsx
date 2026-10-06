"use client";
import {
  MapPin,
  Plus,
  Check,
  Wrench,
  Plug,
  Paintbrush,
  Navigation,
  Columns3,
  Rows3,
  Warehouse,
} from "lucide-react";
import {
  money,
  isWalkable,
  storeAisles,
  storeBays,
  shelfLevels,
} from "@/lib/domain";
export async function api(action, data = {}) {
  const r = await fetch("/api/merlin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  const json = await r.json();
  if (!r.ok)
    throw new Error(json.error || "Não foi possível salvar. Tente novamente.");
  return json;
}
export function CategoryIcon({ category, size = 26 }) {
  const I =
    category === "Hidráulica"
      ? Wrench
      : category === "Elétrica"
        ? Plug
        : Paintbrush;
  return <I size={size} />;
}
export function ProductCard({ p, store, onDetail, onRoute, onAdd }) {
  const available = (p.stock[store] || 0) > 0;
  return (
    <article className="product-card">
      <button
        className="product-visual"
        onClick={() => onDetail(p)}
        aria-label={"Detalhes de " + p.name}
      >
        <CategoryIcon category={p.category} size={44} />
        <span>{p.category}</span>
        {p.featured && <span className="featured">DESTAQUE</span>}
      </button>
      <div className="product-body">
        <small>
          {p.brand} · SKU {p.id}
        </small>
        <button className="product-name" onClick={() => onDetail(p)}>
          {p.name}
        </button>
        <p className="product-attributes">{p.attributes}</p>
        <strong className="price">{money(p.price)}</strong>
        <span className={"stock " + (!available ? "unavailable" : "")}>
          <Check size={14} />
          {available
            ? `${p.stock[store]} un. · estoque demonstrativo`
            : "Indisponível nesta loja"}
        </span>
        <p className="location">
          <MapPin size={14} /> Corredor {p.aisle} · Gôndola {p.bay} · Prateleira{" "}
          {p.shelf}
        </p>
        <div className="card-actions">
          <button
            className="outline"
            onClick={() => (available ? onRoute(p) : onDetail(p))}
          >
            {available ? "Encontrar na loja" : "Ver alternativas"}
          </button>
          <button
            className="add-button"
            aria-label={"Adicionar " + p.name + " à lista"}
            onClick={() => onAdd(p)}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
export function StoreMap({
  start,
  path = [],
  targets = [],
  blocked = [],
  onPoint,
  mini = false,
}) {
  return (
    <svg
      className={"store-map " + (mini ? "compact-map" : "")}
      viewBox="0 0 780 660"
      role="img"
      aria-label="Mapa demonstrativo da loja com corredores, entrada, balcão e rota"
    >
      <rect
        x="4"
        y="4"
        width="772"
        height="650"
        rx="24"
        fill="#f4f6ef"
        stroke="#dce4d6"
      />
      {Array.from({ length: 13 }, (_, x) =>
        Array.from(
          { length: 11 },
          (_, y) =>
            isWalkable({ x, y }) && (
              <rect
                key={`${x}-${y}`}
                x={x * 60 + 4}
                y={y * 60 + 4}
                width="52"
                height="52"
                rx="8"
                fill="transparent"
                onClick={() => onPoint?.({ x, y })}
                className={onPoint ? "map-cell" : ""}
              />
            ),
        ),
      )}
      {storeBays.map(({ x, id, aisle }) => (
        <g key={x}>
          {[2, 6].map((y) => (
            <g key={y}>
              <rect
                x={x * 60 + 3}
                y={y * 60}
                width="54"
                height="176"
                rx="7"
                fill={storeAisles.find((a) => a.id === aisle).color}
                stroke="#d0d9ca"
              />
              <line
                x1={x * 60 + 30}
                y1={y * 60 + 8}
                x2={x * 60 + 30}
                y2={y * 60 + 168}
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={x * 60 + 30}
                y={y * 60 + 158}
                textAnchor="middle"
                fontSize="12"
                fill="#43594d"
              >
                {id} · M{y === 2 ? "1" : "2"}
              </text>
            </g>
          ))}
          <text
            x={x * 60 + 30}
            y="106"
            textAnchor="middle"
            fontSize="18"
            fill="#6f8067"
          >
            {id}
          </text>
        </g>
      ))}
      <text x="48" y="47" fontSize="17" fill="#678054" fontWeight="600">
        12 · HIDRÁULICA
      </text>
      <text x="322" y="47" fontSize="17" fill="#617a80" fontWeight="600">
        14 · ELÉTRICA
      </text>
      <text x="574" y="47" fontSize="17" fill="#8c795b" fontWeight="600">
        16 · PINTURA
      </text>
      <rect x="15" y="571" width="163" height="35" rx="8" fill="white" />
      <text x="28" y="595" fontSize="16" fill="#6c7962">
        ENTRADA / SAÍDA
      </text>
      <rect x="550" y="575" width="161" height="34" rx="8" fill="white" />
      <text x="568" y="598" fontSize="16" fill="#6c7962">
        CAIXAS
      </text>
      <text x="672" y="341" fontSize="13" fill="#6b775f">
        BALCÃO
      </text>
      {path.length > 1 && (
        <polyline
          points={path
            .map((p) => `${p.x * 60 + 30},${p.y * 60 + 30}`)
            .join(" ")}
          fill="none"
          stroke="#167443"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {blocked.map((p) => (
        <g key={`${p.x}-${p.y}`}>
          <rect
            x={p.x * 60 + 10}
            y={p.y * 60 + 10}
            width="40"
            height="40"
            rx="8"
            fill="#fbe1d7"
          />
          <text
            x={p.x * 60 + 30}
            y={p.y * 60 + 39}
            textAnchor="middle"
            fill="#a34529"
            fontSize="28"
          >
            ×
          </text>
        </g>
      ))}
      {targets.map((p, i) => (
        <g key={p.id}>
          <path
            d={`M ${p.x * 60 + 30} ${p.y * 60 + 30} c -8 -12 -22 -25 -22 -39 a 22 22 0 1 1 44 0 c 0 14 -14 27 -22 39 Z`}
            fill="#ffc928"
            stroke="white"
            strokeWidth="4"
          />
          <text
            x={p.x * 60 + 30}
            y={p.y * 60 - 2}
            fontSize="20"
            textAnchor="middle"
            fontWeight="bold"
            fill="#443713"
          >
            {i + 1}
          </text>
        </g>
      ))}
      <g pointerEvents="none">
        <rect
          x={Math.min(start.x * 60 + 5, 625)}
          y={Math.max(start.y * 60 - 40, 4)}
          width="145"
          height="30"
          rx="7"
          fill="#075b35"
        />
        <text
          x={Math.min(start.x * 60 + 77, 697)}
          y={Math.max(start.y * 60 - 19, 25)}
          textAnchor="middle"
          fill="white"
          fontSize="15"
          fontWeight="600"
        >
          Você está aqui
        </text>
      </g>
      <circle
        cx={start.x * 60 + 30}
        cy={start.y * 60 + 30}
        r="23"
        fill="#cfe3c7"
      />
      <circle
        cx={start.x * 60 + 30}
        cy={start.y * 60 + 30}
        r="13"
        fill="#087341"
        stroke="white"
        strokeWidth="4"
      />
    </svg>
  );
}
export function download(name, data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function LocationSummary({ product, onRoute, disabled = false }) {
  return (
    <section className="where-to-find" aria-label="Onde encontrar">
      <h3>
        <MapPin size={25} /> Onde encontrar
      </h3>
      <div className="address-columns">
        {[
          ["Corredor", product.aisle, Columns3],
          ["Gôndola", product.bay, Warehouse],
          ["Prateleira", product.shelf, Rows3],
        ].map(([label, value, Icon]) => (
          <div key={label}>
            <Icon aria-hidden="true" size={28} />
            <span>
              {label}
              <strong>{value}</strong>
            </span>
          </div>
        ))}
      </div>
      <p>
        Módulo {product.module} · lado {product.side.toLowerCase()} ·{" "}
        {product.address}
      </p>
      {onRoute && (
        <button
          className="primary full"
          disabled={disabled}
          onClick={() => onRoute(product)}
        >
          <Navigation size={22} /> Iniciar rota
        </button>
      )}
    </section>
  );
}
export function StoreDirectory() {
  return (
    <section
      className="store-directory"
      aria-label="Classificação dos corredores"
    >
      <h3>Endereços da loja</h3>
      <p>
        Gôndolas A–E · módulo 1 ao fundo, módulo 2 próximo à entrada. Faces
        esquerda/direita vistas da entrada em direção ao fundo.
      </p>
      <div className="aisle-directory">
        {storeAisles.map((aisle) => (
          <article key={aisle.id}>
            <h4>
              {aisle.id} · {aisle.category}
            </h4>
            {storeBays
              .filter((bay) => bay.aisle === aisle.id)
              .map((bay) => (
                <div key={bay.id}>
                  <b>
                    Gôndola {bay.id} · {bay.name}
                  </b>
                  <p>
                    M1: {bay.modules[0]}
                    <br />
                    M2: {bay.modules[1]}
                  </p>
                </div>
              ))}
          </article>
        ))}
      </div>
      <p>
        <b>Prateleiras, de baixo para cima:</b>
      </p>
      <ul>
        {shelfLevels.map((level) => (
          <li key={level.id}>
            <b>P{level.id}</b> · {level.name}
          </li>
        ))}
      </ul>
      <small>
        Endereçamento proposto para o protótipo; confirmar a distribuição física
        nas lojas.
      </small>
    </section>
  );
}
