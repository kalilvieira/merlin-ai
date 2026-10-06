# Merlin AI — protótipo web para clientes

Protótipo responsivo do Challenge 2026, baseado no escopo e requisitos fornecidos e na identidade visual do Merlin. Conforme a revisão de escopo, esta entrega apresenta **exclusivamente a visão do cliente**: não há administração, permissões de equipe, painel gerencial, gestão de catálogo/mapa ou dashboard operacional.

## Experimentar

1. Abra o site privado com sua conta. A autenticação protege a lista e os dados da demonstração; não há papéis administrativos.
2. Em **Assistente**, experimente “peça para tapar cano” e depois “50 mm”.
3. Consulte detalhes, adicione produtos à lista e crie uma rota até as prateleiras.
4. Altere a loja para testar a disponibilidade. A loja e os SKUs podem ser levados ao celular por QR Code.
5. Explore projetos e tutoriais, envie uma avaliação ou registre um pedido demonstrativo de ajuda.

Catálogo inicial: 18 produtos fictícios em Hidráulica, Elétrica e Pintura; duas lojas piloto fictícias. Valores, quantidades, coordenadas e marcas são ilustrativos e não foram consultados em ERP.

## Funcionalidades do cliente

| Recurso | Entrega e limites |
|---|---|
| Busca por texto / SKU / setor | Pesquisa por nomes, termos e sinônimos em catálogo demonstrativo |
| Linguagem informal | Tradução por dicionário e ranking textual; não há LLM conectado |
| Conversa contextual | Perguntas de refinamento para diâmetro, tensão e área de pintura, com fluxos predefinidos |
| Foto | Consentimento, seleção/captura, prévia local e exploração manual por setor. Não realiza reconhecimento visual por IA |
| Produtos e complementares | Características, preços fictícios, estoque por loja, acessórios e materiais relacionados |
| Indisponibilidade | Alternativas por categoria e consulta a outra loja. Compatibilidade deve ser confirmada |
| Localização | Corredor, gôndola, módulo, lado, prateleira e coordenadas fictícias |
| Mapa e rotas | Grafo navegável, obstáculos, menor caminho e atualização manual de posição |
| Multi-produto | Otimização de até 10 produtos por rota; escala ilustrativa de 2 m por célula |
| Guia por câmera | Vídeo local com destino e localização da prateleira. Não é RA espacial: sem tracking ou ancoragem |
| Lista | Quantidades, marcação de item encontrado, remoção, total fictício, exportação e persistência por conta |
| QR de continuação | Link com loja e SKUs, reconstruindo rota da entrada no outro dispositivo autorizado |
| Quiosque | Modo de autoatendimento da sessão privada. Uso público requer isolamento de sessões e conta de dispositivo |
| Feedback | Nota 1–5, confirmação de produto encontrado e comentário salvos |
| Ajuda humana | Pedido demonstrativo persistente com protocolo. Nenhum vendedor é notificado |
| Tutoriais | Etapas de planejamento, cuidados e lista de materiais |
| Privacidade | Consentimento para foto/câmera e exclusão manual dos dados da conta |
| Idioma | Português brasileiro. Traduções ES/EN não implementadas |

## Exclusões solicitadas

RF-13 (painel administrativo), RF-17 (atualização administrativa de mapa), dashboards de RF-16 e qualquer função de gestão de equipe foram removidos do produto e de suas APIs. O catálogo e a planta são dados fixos do protótipo. Eventos mínimos da jornada são armazenados sem dashboard ou consulta gerencial; podem ser excluídos pela própria conta em Privacidade.

## Dados e segurança

- Banco D1 com consultas preparadas e migrações versionadas.
- APIs exigem identidade autenticada encaminhada pela plataforma; listas e registros pessoais são vinculados a essa identidade.
- Escritas de origem divergente são bloqueadas.
- Fotos e vídeos não são enviados ao servidor. Fechar a página descarta a foto.
- A posição é manual: não há coleta de GPS/BLE/Wi-Fi.
- Dados ficam retidos até exclusão manual. Evite digitar dados pessoais nos campos livres.
- Service worker exibe orientação de reconexão; não armazena APIs privadas em cache.
- Nenhuma credencial de IA, ERP, CRM ou sensores foi incluída.

## Execução e manutenção

Node.js >= 22.13 e npm. `npm install` instala as dependências, `npm run dev` inicia localmente e `npm run build` compila.

Variável de ambiente: `DATABASE_URL` (Postgres, por exemplo Neon via Vercel Marketplace). A tabela `records` é criada automaticamente na primeira requisição. Sem login: cada navegador recebe um identificador anônimo em cookie, e listas e registros ficam vinculados a ele.

Deploy na Vercel: importe o repositório (Next.js é detectado automaticamente), conecte um banco Postgres/Neon ao projeto para definir `DATABASE_URL` e faça o deploy.

Tecnologias: React/JSX com Next.js (App Router), Radix, Lucide, QRCode e Postgres (Neon).
