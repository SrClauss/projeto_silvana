from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.saidas import Saida
from ..models.faturamento_item import FaturamentoItem
from ..models.despesas import Despesa
from ..models.imposto_a_recolher import ImpostoARecolher
from datetime import datetime, timedelta
from fastapi import HTTPException
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# Função auxiliar para calcular estoque
async def get_estoque_atual(produto_id: str):
    pipeline = [
        {"$match": {"_id": produto_id}},
        {"$lookup": {"from": "entradas", "localField": "_id", "foreignField": "produtos_id", "as": "entradas"}},
        {"$lookup": {"from": "saidas", "localField": "_id", "foreignField": "produtos_id", "as": "saidas"}},
        {"$addFields": {
            "total_entradas": {"$sum": "$entradas.quantidade"},
            "total_saidas": {"$sum": "$saidas.quantidade"},
            "estoque": {"$subtract": ["$total_entradas", "$total_saidas"]}
        }},
        {"$project": {"estoque": 1}}
    ]
    result = await db.produtos.aggregate(pipeline).to_list(None)
    return result[0]["estoque"] if result else 0

# CRUD para Saida
async def create_saida(saida: Saida):
    # Validação: verificar estoque
    estoque = await get_estoque_atual(saida.produtos_id)
    if estoque < saida.quantidade:
        raise HTTPException(status_code=400, detail="Estoque insuficiente")
    
    result = await db.saidas.insert_one(saida.dict(by_alias=True))
    return result.inserted_id

async def get_saidas():
    return await db.saidas.find().to_list(None)

async def get_saida_by_id(saida_id: str):
    return await db.saidas.find_one({"_id": saida_id})

async def get_saidas_filtered(page: int = 1, per_page: int = 20, date_from: str | None = None, date_to: str | None = None,
                               produto_id: str | None = None, produto_query: str | None = None, tag_ids: list | None = None, cliente_id: str | None = None, sort_by: str = 'data', order: str = 'desc'):
    """Retorna vendas (saidas tipo 'venda') com filtros, ordenação e paginação.

    - date_from / date_to: strings no formato YYYY-MM-DD (date_only)
    - produto_id: filtra por produto exato
    - produto_query: texto para buscar em descricao do produto
    - tag_ids: lista de tag _id para filtrar produtos que possuam qualquer uma das tags (OR)
    - cliente_id: filtra por cliente exato
    - sort_by: 'valor' ou 'data'
    - order: 'asc' ou 'desc'
    """
    match_stage = {"tipo": "venda"}

    # Date filters
    date_filter = {}
    from datetime import datetime, timedelta
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            date_filter["$gte"] = df
        except Exception:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            # include entire day
            dt = dt + timedelta(days=1)
            date_filter["$lt"] = dt
        except Exception:
            pass
    if date_filter:
        match_stage["data_saida"] = date_filter

    if produto_id:
        match_stage["produtos_id"] = produto_id

    if cliente_id:
        match_stage["cliente_id"] = cliente_id

    pipeline = [
        {"$match": match_stage},
        {"$lookup": {"from": "produtos", "localField": "produtos_id", "foreignField": "_id", "as": "produto"}},
        {"$unwind": {"path": "$produto", "preserveNullAndEmptyArrays": True}},
        # lookup cliente info
        {"$lookup": {"from": "clientes", "localField": "cliente_id", "foreignField": "_id", "as": "cliente"}},
        {"$unwind": {"path": "$cliente", "preserveNullAndEmptyArrays": True}},
    ]

    # produto_query matching
    if produto_query:
        regex = {"$regex": produto_query, "$options": "i"}
        pipeline.append({"$match": {"$or": [{"produto.descricao": regex}, {"produto.codigo_interno": regex}, {"produto.codigo_externo": regex}]}})

    # tag filtering (OR): produto.tags._id in tag_ids
    if tag_ids:
        pipeline.append({"$match": {"produto.tags._id": {"$in": tag_ids}}})

    # Sorting
    sort_field = "data_saida" if sort_by != 'valor' else "valor_total"
    sort_order = -1 if (order or 'desc').lower() == 'desc' else 1

    # Facet to get total count and paginated results
    skip = (max(1, page) - 1) * max(1, per_page)
    pipeline.extend([
        {"$sort": {sort_field: sort_order}},
        {"$facet": {
            "metadata": [{"$count": "total"}],
            "data": [{"$skip": skip}, {"$limit": per_page}]
        }}
    ])

    result = await db.saidas.aggregate(pipeline).to_list(None)
    if not result:
        return {"total": 0, "items": []}
    metadata = result[0].get("metadata", [])
    total = metadata[0]["total"] if metadata else 0
    items = result[0].get("data", [])

    # Format items: flatten produto and cliente info
    for it in items:
        prod = it.pop("produto", None)
        if prod:
            it["produto_descricao"] = prod.get("descricao")
            it["produto_codigo_interno"] = prod.get("codigo_interno")
            it["preco_venda"] = prod.get("preco_venda")
        client = it.pop("cliente", None)
        if client:
            # include useful client fields
            it["cliente_nome"] = client.get("nome")
            it["cliente_telefone"] = client.get("telefone")
            # include cpf if available
            it["cliente_cpf"] = client.get("cpf")

    return {"total": total, "items": items}

async def update_saida(saida_id: str, update_data: dict):
    return await db.saidas.find_one_and_update(
        {"_id": saida_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_saida(saida_id: str):
    return await db.saidas.delete_one({"_id": saida_id})

# Agregação para Saida
async def get_saida_com_produto(saida_id: str):
    pipeline = [
        {"$match": {"_id": saida_id}},
        {"$lookup": {"from": "produtos", "localField": "produtos_id", "foreignField": "_id", "as": "produto"}}
    ]
    return await db.saidas.aggregate(pipeline).to_list(None)

# Processar venda: cria faturamento e despesas se taxa
async def processar_venda(saida_id: str, modalidade_id: str, impostos_adicionais: list = None, desconto: float = 0):
    saida = await get_saida_by_id(saida_id)
    modalidade = await db.modalidade_pagamento.find_one({"_id": modalidade_id})
    if not saida or not modalidade:
        return None

    # Aplicar desconto
    valor_base = saida.get("valor_total", 0) - desconto
    if valor_base < 0:
        valor_base = 0

    # Criar faturamento
    faturamento = FaturamentoItem(
        saida_id=saida_id,
        valor=valor_base,
        justificativa=f"Venda via {modalidade['nome']}"
    )
    fat_id = await db.faturamento_item.insert_one(faturamento.dict(by_alias=True))

    # Calcular taxa
    if modalidade["tipo_taxa"] == "percentual":
        taxa = valor_base * (modalidade["valor_taxa"] / 100)
    else:
        taxa = modalidade["valor_taxa"]

    if taxa > 0:
        despesa = Despesa(
            descricao=f"Taxa {modalidade['nome']} para venda {saida_id}",
            valor=taxa
        )
        await db.despesas.insert_one(despesa.dict(by_alias=True))

    # Impostos da modalidade
    impostos = modalidade.get("impostos", [])
    if impostos_adicionais:
        impostos.extend(impostos_adicionais)

    # Criar imposto a recolher para cada imposto
    for imp in impostos:
        valor_imposto = valor_base * (imp["percentual"] / 100)
        imposto = ImpostoARecolher(
            saida_id=saida_id,
            valor_imposto=valor_imposto,
            tipo_imposto=imp["tipo"],
            data_vencimento=datetime.utcnow() + timedelta(days=30)
        )
        await db.imposto_a_recolher.insert_one(imposto.dict(by_alias=True))

    return {"faturamento_id": fat_id.inserted_id}