# Sistema de Vendas e Condicionais

Este documento explica as novas funcionalidades implementadas no sistema de vendas e gerenciamento de condicionais.

## Visão Geral

O sistema agora inclui:
1. **Sistema de Vendas com lógica FIFO** (First In, First Out)
2. **Condicional de Fornecedor** - Produtos recebidos em condicional com limite de devolução
3. **Condicional de Cliente** - Produtos enviados para prova com processamento de devoluções

## 1. Sistema de Vendas (FIFO)

### Funcionalidade
O sistema de vendas implementa a lógica FIFO (First In, First Out), onde os itens mais antigos são vendidos primeiro, baseado na data de aquisição (`acquisition_date`).

### Características
- **Prioridade por data**: Itens com `acquisition_date` mais antiga são vendidos primeiro
- **Remoção automática**: Quando a quantidade de um item chega a 0, ele é removido automaticamente
- **Exclusão de condicionais**: Itens marcados como condicional (fornecedor ou cliente) não são contabilizados no estoque disponível
- **Timestamps precisos**: A data de aquisição é armazenada com precisão de microssegundos

### Endpoints

#### POST `/vendas/`
Cria uma nova venda seguindo a lógica FIFO.

**Request Body:**
```json
{
  "produto_id": "string",
  "quantidade": 1,
  "cliente_id": "string (opcional)",
  "valor_total": 0,
  "observacoes": "string (opcional)"
}
```

**Response:**
```json
{
  "success": true,
  "saida_id": "string",
  "quantidade_vendida": 1,
  "estoque_restante": 10
}
```

#### GET `/vendas/estoque/{produto_id}`
Retorna o estoque disponível de um produto (excluindo itens em condicional).

**Response:**
```json
{
  "produto_id": "string",
  "estoque_disponivel": 10
}
```

### Frontend
A página de vendas (`/vendas`) permite:
- Buscar produtos por código interno ou descrição
- Ver estoque disponível vs. itens em condicional
- Criar vendas rapidamente com interface intuitiva

## 2. Condicional de Fornecedor

### Funcionalidade
Gerencia produtos recebidos de fornecedores como "empréstimo", com um limite de quantos itens podem ser devolvidos.

### Características
- **Limite de devolução**: Define quantos itens no máximo podem ser devolvidos
- **Marcação de itens**: Itens são marcados com `condicional_fornecedor_id`
- **Controle visual**: Barra de progresso mostra quantos itens ainda podem ser devolvidos
- **Devolução FIFO**: Devoluções seguem a mesma lógica FIFO das vendas

### Endpoints

#### POST `/condicionais-fornecedor/`
Cria uma nova condicional de fornecedor.

**Request Body:**
```json
{
  "fornecedor_id": "fornecedor_123",
  "quantidade_max_devolucao": 10,
  "data_condicional": "2026-01-15",
  "observacoes": "Produtos para teste"
}
```

**Response:**
```json
{
  "id": "condicional_forn_abc"
}
```

**Notas:**
- `quantidade_max_devolucao` pode ser `null` para devolução ilimitada
- `produtos_id` é inicialmente vazio, produtos são adicionados depois

#### GET `/condicionais-fornecedor/`
Lista todas as condicionais de fornecedor.

**Response:**
```json
[
  {
    "_id": "condicional_forn_abc",
    "fornecedor_id": "fornecedor_123",
    "produtos_id": ["produto_456", "produto_789"],
    "quantidade_max_devolucao": 10,
    "data_condicional": "2026-01-15T00:00:00Z",
    "observacoes": "Produtos para teste"
  }
]
```

#### GET `/condicionais-fornecedor/{id}`
Retorna uma condicional específica.

#### GET `/condicionais-fornecedor/{id}/completa`
Retorna a condicional com dados completos do fornecedor e produtos (agregação).

**Response:**
```json
{
  "_id": "condicional_forn_abc",
  "fornecedor_id": "fornecedor_123",
  "fornecedor": {
    "_id": "fornecedor_123",
    "nome": "Fornecedor XYZ Ltda"
  },
  "produtos": [
    {
      "_id": "produto_456",
      "codigo_interno": "VEST001",
      "descricao": "Vestido Floral",
      "itens": [...]
    }
  ],
  "quantidade_max_devolucao": 10,
  "data_condicional": "2026-01-15T00:00:00Z"
}
```

#### POST `/condicionais-fornecedor/{id}/adicionar-produto`
Adiciona um produto ao condicional de fornecedor.

**Request Body:**
```json
{
  "produto_id": "produto_456",
  "quantidade": 5
}
```

**Response:**
```json
{
  "success": true,
  "produto_id": "produto_456",
  "quantidade": 5
}
```

**Notas:**
- Cria novos itens no produto marcados com este `condicional_fornecedor_id`
- Itens têm `acquisition_date` = timestamp atual
- Produto é automaticamente adicionado à lista `produtos_id` da condicional

#### POST `/condicionais-fornecedor/{id}/devolver-itens`
Devolve itens para o fornecedor.

**Request Body:**
```json
{
  "produto_id": "produto_456",
  "quantidade": 3
}
```

**Response:**
```json
{
  "success": true,
  "saida_id": "saida_dev_xyz",
  "quantidade_devolvida": 3,
  "pode_devolver_ainda": 7
}
```

**Response (Error - Exceeds Limit):**
```json
{
  "detail": "Limite de devolução excedido. Máximo: 10, Já devolvido: 8"
}
```

**Notas:**
- Remove itens FIFO do estoque (oldest first)
- Cria registro de Saída tipo "devolucao"
- Valida limite de devolução (`quantidade_max_devolucao`)
- Se estoque total do produto zera, produto é deletado automaticamente

#### GET `/condicionais-fornecedor/{id}/status-devolucao`
Retorna o status de devolução do condicional.

**Query Params (Optional):**
- `produto_id`: Filtrar por produto específico

**Response:**
```json
{
  "condicional_id": "condicional_forn_abc",
  "quantidade_max_devolucao": 10,
  "quantidade_devolvida": 3,
  "quantidade_pode_devolver": 7,
  "quantidade_em_condicional": 12,
  "quantidade_vendida": 2
}
```

**Notas:**
- `quantidade_em_condicional`: Total de itens ainda marcados com este condicional
- `quantidade_vendida`: Quantos itens foram vendidos (originados deste condicional)
- `quantidade_devolvida`: Quantos já foram devolvidos ao fornecedor
- `quantidade_pode_devolver`: Quanto ainda pode devolver dentro do limite

#### POST `/condicionais-fornecedor/{id}/processar-condicional`
Processa o fechamento de uma condicional de fornecedor.

**Request Body:**
```json
{
  "ids_produtos_devolvidos": ["produto_456", "produto_789"]
}
```

**Response:**
```json
{
  "success": true,
  "condicional_id": "condicional_forn_abc",
  "results": [
    {
      "produto_id": "produto_456",
      "modified": true,
      "produto_deletado": false
    },
    {
      "produto_id": "produto_789",
      "modified": true,
      "produto_deletado": true
    }
  ]
}
```

**Comportamento:**
- Marca condicional como `fechada: true` e `ativa: false`
- Produtos em `ids_produtos_devolvidos`: remove itens do estoque
- Produtos NÃO devolvidos: remove apenas a marcação condicional (viram estoque normal)
- Se produto fica com estoque zero, é deletado automaticamente

### Workflows Comuns

**Workflow 1: Receber Produtos em Condicional**
```
1. POST /condicionais-fornecedor/ 
   → Criar condicional com limite de devolução
   
2. POST /condicionais-fornecedor/{id}/adicionar-produto
   → Adicionar produto 1
   
3. POST /condicionais-fornecedor/{id}/adicionar-produto
   → Adicionar produto 2
   
4. GET /condicionais-fornecedor/{id}/status-devolucao
   → Verificar status
```

**Workflow 2: Devolver Itens ao Fornecedor**
```
1. GET /condicionais-fornecedor/{id}/status-devolucao
   → Ver quanto pode devolver
   
2. POST /condicionais-fornecedor/{id}/devolver-itens
   → Devolver alguns itens
   
3. GET /condicionais-fornecedor/{id}/status-devolucao
   → Confirmar novo status
```

**Workflow 3: Encerrar Condicional**
```
1. GET /condicionais-fornecedor/{id}/completa
   → Ver todos os produtos
   
2. POST /condicionais-fornecedor/{id}/processar-condicional
   → Marcar quais foram devolvidos
   → Resto vira estoque normal
```

### Frontend
A página de Condicional Fornecedor (`/condicionais-fornecedor`) mostra:
- Barra de progresso visual do limite de devolução
- Indicador de quantos itens ainda podem ser devolvidos
- Interface para devolver itens

## 3. Condicional de Cliente

### Funcionalidade
Gerencia produtos enviados para clientes provarem em casa. O sistema registra quais produtos foram devolvidos (por código interno) e gera vendas automáticas para os não devolvidos.

### Características
- **Envio para cliente**: Marca itens com `condicional_cliente_id`
- **Processamento por código**: Devoluções são registradas pelo código interno do produto
- **Venda automática**: Produtos não devolvidos geram saídas de venda automaticamente
- **Encerramento**: Condicional é marcada como inativa após processamento
- **Transações**: Usa transações MongoDB quando disponível (replica set) para garantir atomicidade
- **Idempotência**: Previne duplicação em caso de requisições repetidas

### Endpoints

#### POST `/condicionais-cliente/`
Cria uma nova condicional de cliente com produtos.

**Request Body:**
```json
{
  "cliente_id": "cliente_123",
  "produtos": [
    {
      "produto_id": "produto_456",
      "quantidade": 3
    },
    {
      "produto_id": "produto_789",
      "quantidade": 2
    }
  ],
  "observacoes": "Cliente quer experimentar em casa"
}
```

**Response (Success):**
```json
{
  "id": "condicional_abc123"
}
```

**Response (Error - Insufficient Stock):**
```json
{
  "detail": "Estoque insuficiente. Disponível: 1"
}
```

**Response (Error - Product Not Found):**
```json
{
  "detail": "Produto não encontrado"
}
```

**Notas:**
- Operação é transacional quando MongoDB está configurado como replica set
- Em caso de falha parcial, todas as mudanças são revertidas (rollback)
- Produtos são marcados FIFO (First In, First Out) baseado em `acquisition_date`

#### POST `/condicionais-cliente/{id}/adicionar-produto`
Adiciona um produto adicional a uma condicional existente.

**Request Body:**
```json
{
  "produto_id": "produto_999",
  "quantidade": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "produto_id": "produto_999",
  "quantidade": 1
}
```

**Response (Error):**
```json
{
  "detail": "Condicional não está ativa"
}
```

**Notas:**
- Implementa idempotência: se o produto já existe, incrementa a quantidade
- Apenas condicionais ativas podem receber novos produtos
- Verifica disponibilidade de estoque antes de marcar itens

#### POST `/condicionais-cliente/{id}/enviar-produto`
Alias para `/adicionar-produto` - mesmo comportamento.

#### GET `/condicionais-cliente/{id}/completa`
Retorna a condicional com dados completos dos produtos e cliente (agregação).

**Response:**
```json
{
  "_id": "condicional_abc123",
  "cliente_id": "cliente_123",
  "cliente": {
    "_id": "cliente_123",
    "nome": "João Silva",
    "telefone": "(11) 98765-4321"
  },
  "produtos": [
    {
      "produto_id": "produto_456",
      "quantidade": 3,
      "produto": {
        "_id": "produto_456",
        "codigo_interno": "VEST001",
        "descricao": "Vestido Floral",
        "valor_venda": 15000
      }
    }
  ],
  "data_condicional": "2026-01-15T10:30:00Z",
  "data_devolucao": null,
  "ativa": true,
  "observacoes": "Cliente quer experimentar em casa"
}
```

#### POST `/condicionais-cliente/{id}/calcular-retorno`
Calcula o que seria devolvido e vendido sem aplicar mudanças no banco (preview).

**Request Body:**
```json
{
  "produtos_devolvidos_codigos": ["VEST001", "VEST002"]
}
```

**Response:**
```json
{
  "condicional_id": "condicional_abc123",
  "produtos": [
    {
      "produto_id": "produto_456",
      "codigo_interno": "VEST001",
      "quantidade_enviada": 3,
      "quantidade_devolvida": 2,
      "quantidade_vendida": 1
    },
    {
      "produto_id": "produto_789",
      "codigo_interno": "BLUSA003",
      "quantidade_enviada": 2,
      "quantidade_devolvida": 0,
      "quantidade_vendida": 2
    }
  ]
}
```

**Notas:**
- Endpoint de preview - não modifica banco de dados
- Útil para UI mostrar confirmação antes de processar
- Conta ocorrências de códigos devolvidos (ex: 2x "VEST001" = 2 unidades devolvidas)

#### POST `/condicionais-cliente/{id}/processar-retorno`
Processa o retorno definitivo de uma condicional de cliente.

**Request Body (Simple):**
```json
{
  "produtos_devolvidos_codigos": ["VEST001", "VEST002"],
  "auto_create_sales": true
}
```

**Request Body (Advanced - Multiple Sales):**
```json
{
  "produtos_devolvidos_codigos": ["VEST001"],
  "vendas": [
    {
      "produto_id": "produto_789",
      "quantidade": 1,
      "valor_total": 15000,
      "observacoes": "Venda 1"
    },
    {
      "produto_id": "produto_789",
      "quantidade": 1,
      "valor_total": 14000,
      "observacoes": "Venda 2 com desconto"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "condicional_id": "condicional_abc123",
  "vendas_criadas": [
    {
      "saida_id": "saida_xyz789",
      "produto_id": "produto_456",
      "quantidade": 1
    },
    {
      "saida_id": "saida_xyz790",
      "produto_id": "produto_789",
      "quantidade": 2
    }
  ],
  "devolucoes_processadas": [
    {
      "produto_id": "produto_456",
      "quantidade": 2
    }
  ]
}
```

**Notas:**
- Produtos devolvidos: marcação condicional é removida, voltam ao estoque normal
- Produtos não devolvidos: são vendidos e removidos do estoque
- Condicional é marcada como `ativa: false` após processamento
- Suporta criar múltiplas vendas para diferentes clientes/valores
- Se `vendas` fornecido, valida que soma confere com quantidade_vendida calculada

### Idempotência e Retry

**Recomendações:**
- Em caso de timeout ou erro de rede, é seguro repetir a requisição de criação
- Sistema previne duplicação incrementando quantidade se produto já existe
- Para idempotência perfeita, considere usar um `request_id` único no cliente

**Exemplo de Retry Logic (JavaScript):**
```javascript
async function criarCondicionalComRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await api.post('/condicionais-cliente/', data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        // Erro de validação, não retry
        throw error;
      }
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Backoff exponencial
    }
  }
}
```

### Transações MongoDB

**Requisitos:**
- MongoDB configurado como **replica set** ou **sharded cluster**
- Para ambientes standalone, o sistema usa fallback com rollback manual

**Verificar Suporte a Transações:**
```bash
# No mongo shell
rs.status()
```

**Configurar Replica Set (Desenvolvimento):**
```bash
# docker-compose.yml
mongodb:
  image: mongo:6
  command: --replSet rs0
  
# Inicializar replica set
docker exec -it mongodb mongo --eval "rs.initiate()"
```

**Logs:**
- Sistema detecta automaticamente se transações estão disponíveis
- Logs indicam se operação usou transações ou fallback
- Exemplo: `"Created condicional abc123 with 2 products (transactional)"`

### Frontend
A página de Condicional Cliente (`/condicionais-cliente`) permite:
- Visualizar condicionais ativas
- Adicionar códigos internos dos produtos devolvidos
- Ver quantos produtos serão vendidos (não devolvidos)
- Processar o retorno com um clique

## Modelos de Dados

### Item
```python
class Item(BaseModel):
    quantity: int
    acquisition_date: datetime  # Com precisão de microssegundos
    condicional_fornecedor_id: Optional[str] = None
    condicional_cliente_id: Optional[str] = None
```

### CondicionalFornecedor
```python
class CondicionalFornecedor(BaseModel):
    fornecedor_id: str
    produtos_id: List[str]
    quantidade_max_devolucao: int  # Limite de devolução
    data_condicional: datetime
```

### CondicionalCliente
```python
class CondicionalCliente(BaseModel):
    cliente_id: str
    produtos: List[ProdutoQuantity]
    data_condicional: datetime
    data_devolucao: Optional[datetime]
    ativa: bool
```

## Fluxo de Trabalho

### 1. Venda Normal
1. Cliente escolhe produtos na loja
2. Sistema busca itens disponíveis (não em condicional)
3. Aplica FIFO: vende itens mais antigos primeiro
4. Remove itens quando quantidade chega a 0
5. Cria registro de Saída

### 2. Condicional de Fornecedor
1. Fornecedor envia produtos em condicional
2. Sistema cria CondicionalFornecedor com limite de devolução
3. Produtos são adicionados e marcados com `condicional_fornecedor_id`
4. Loja pode devolver até o limite estabelecido
5. Devolução cria registro de Saída tipo "devolucao"

### 3. Condicional de Cliente
1. Cliente pede para provar produtos em casa
2. Sistema cria CondicionalCliente
3. Produtos são enviados e marcados com `condicional_cliente_id`
4. Cliente devolve alguns produtos (registrados por código interno)
5. Sistema:
   - Desmarca produtos devolvidos
   - Cria vendas para produtos não devolvidos
   - Encerra a condicional

## Notas Técnicas

### Timestamps
O campo `acquisition_date` usa `datetime.utcnow()` que fornece precisão de microssegundos, garantindo ordenação correta mesmo para itens inseridos no mesmo segundo.

### Performance
- Condicional Cliente usa `Counter` para contar códigos devolvidos em O(n) ao invés de O(n²)
- Item matching usa múltiplos critérios para evitar conflitos com datas duplicadas

### Estoque
- `em_condicional`: Total de itens marcados como condicional
- Estoque disponível = Total de itens - itens em condicional
- Vendas só podem ser feitas com estoque disponível

## Exemplos de Uso

### Criar uma venda
```bash
curl -X POST http://localhost:8000/vendas/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": "produto123",
    "quantidade": 2,
    "cliente_id": "cliente456",
    "valor_total": 20000
  }'
```

### Adicionar produto ao condicional de fornecedor
```bash
curl -X POST http://localhost:8000/condicionais-fornecedor/cond123/adicionar-produto \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": "produto123",
    "quantidade": 5
  }'
```

### Processar retorno de condicional de cliente
```bash
curl -X POST http://localhost:8000/condicionais-cliente/cond456/processar-retorno \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "produtos_devolvidos_codigos": ["VEST001", "VEST002"]
  }'
```

## Sistema de Impostos e Despesas

### Configuração de Impostos

O sistema permite configurar impostos que serão aplicados automaticamente às vendas.

#### POST `/impostos-config/`
Cria uma nova configuração de imposto.

**Request Body:**
```json
{
  "nome": "ICMS Padrão",
  "tipo_imposto": "ICMS",
  "aliquota_percentual": 18.0,
  "ativa": true,
  "dias_vencimento": 30,
  "data_inicio": "2026-01-01T00:00:00Z",
  "data_fim": null,
  "valor_minimo_venda": 100.0,
  "observacoes": "Alíquota padrão para produtos"
}
```

**Response:**
```json
{
  "id": "config_abc123"
}
```

#### GET `/impostos-config/ativas`
Lista configurações ativas para uma data específica.

**Query Params:**
- `data_referencia`: Data ISO (opcional, default = hoje)

**Response:**
```json
[
  {
    "_id": "config_abc123",
    "nome": "ICMS Padrão",
    "tipo_imposto": "ICMS",
    "aliquota_percentual": 18.0,
    "ativa": true,
    "dias_vencimento": 30
  }
]
```

### Impostos A Recolher

Impostos são criados automaticamente quando uma venda é processada, baseados nas configurações ativas.

#### GET `/impostos/pendentes`
Lista todos os impostos pendentes (não pagos).

**Response:**
```json
[
  {
    "_id": "imposto_xyz789",
    "saida_id": "saida_abc123",
    "valor_imposto": 360.0,
    "tipo_imposto": "ICMS",
    "data_vencimento": "2026-02-15T00:00:00Z",
    "status": "pendente",
    "created_at": "2026-01-15T10:30:00Z"
  }
]
```

#### POST `/impostos/{id}/marcar-pago`
Marca um imposto como pago.

**Request Body:**
```json
{
  "data_pagamento": "2026-02-10T00:00:00Z"
}
```

#### GET `/impostos/agregados/periodo`
Retorna total de impostos por tipo em um período.

**Query Params:**
- `data_inicio`: Data ISO
- `data_fim`: Data ISO

**Response:**
```json
[
  {
    "_id": "ICMS",
    "total": 5400.0,
    "count": 15
  },
  {
    "_id": "PIS",
    "total": 650.0,
    "count": 15
  }
]
```

### Despesas

Sistema para registrar e acompanhar despesas do negócio.

#### POST `/despesas/`
Cria uma nova despesa.

**Request Body:**
```json
{
  "descricao": "Aluguel loja",
  "valor": 250000,
  "data_despesa": "2026-01-01T00:00:00Z",
  "categoria": "fixos",
  "observacoes": "Aluguel mensal"
}
```

**Response:**
```json
{
  "id": "despesa_def456"
}
```

#### GET `/despesas/mes/{ano}/{mes}`
Lista despesas de um mês específico.

**Path Params:**
- `ano`: Ano (ex: 2026)
- `mes`: Mês (1-12)

**Response:**
```json
[
  {
    "_id": "despesa_def456",
    "descricao": "Aluguel loja",
    "valor": 250000,
    "categoria": "fixos",
    "data_despesa": "2026-01-01T00:00:00Z"
  }
]
```

### Como Funciona o Cálculo Automático de Impostos

1. **Configuração**: Administrador cria configurações de impostos (`POST /impostos-config/`)
2. **Venda**: Quando uma venda é processada (ex: em `processar-retorno` de condicional)
3. **Cálculo**: Sistema identifica configurações ativas aplicáveis à venda
4. **Criação**: Imposto é calculado e registrado automaticamente
5. **Vencimento**: Data de vencimento é calculada (ex: 30 dias após venda)
6. **Consulta**: Impostos podem ser consultados em `/impostos/pendentes`
7. **Pagamento**: Marcar como pago com `/impostos/{id}/marcar-pago`

**Exemplo de Fluxo:**
```
1. Config: ICMS 18% ativo desde 01/01/2026
2. Venda: R$ 2.000,00 em 15/01/2026
3. Cálculo: R$ 2.000 × 18% = R$ 360,00
4. Imposto criado: R$ 360,00, vencimento 15/02/2026
5. Consulta em /impostos/pendentes mostra o imposto
6. Após pagamento, marcar como pago
```
