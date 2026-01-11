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

#### POST `/condicionais-fornecedor/{id}/adicionar-produto`
Adiciona um produto ao condicional de fornecedor.

**Request Body:**
```json
{
  "produto_id": "string",
  "quantidade": 1
}
```

#### POST `/condicionais-fornecedor/{id}/devolver-itens`
Devolve itens para o fornecedor.

**Request Body:**
```json
{
  "produto_id": "string",
  "quantidade": 1
}
```

**Response:**
```json
{
  "success": true,
  "saida_id": "string",
  "quantidade_devolvida": 1,
  "pode_devolver_ainda": 5
}
```

#### GET `/condicionais-fornecedor/{id}/status-devolucao`
Retorna o status de devolução do condicional.

**Response:**
```json
{
  "condicional_id": "string",
  "quantidade_max_devolucao": 10,
  "quantidade_devolvida": 3,
  "quantidade_pode_devolver": 7,
  "quantidade_em_condicional": 10
}
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

### Endpoints

#### POST `/condicionais-cliente/{id}/enviar-produto`
Envia um produto como condicional para o cliente.

**Request Body:**
```json
{
  "produto_id": "string",
  "quantidade": 1
}
```

#### POST `/condicionais-cliente/{id}/processar-retorno`
Processa o retorno de uma condicional de cliente.

**Request Body:**
```json
{
  "produtos_devolvidos_codigos": ["COD001", "COD002", "COD003"]
}
```

**Response:**
```json
{
  "success": true,
  "condicional_id": "string",
  "vendas_criadas": [
    {
      "saida_id": "string",
      "produto_id": "string",
      "quantidade": 1
    }
  ],
  "devolucoes_processadas": [
    {
      "produto_id": "string",
      "quantidade": 2
    }
  ]
}
```

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
