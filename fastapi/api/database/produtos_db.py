from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.produtos import Produto
import os
import logging
from ..database.tags_db import get_or_create_tag_by_descricao, get_tag_by_id
from ..database.entradas_db import create_entrada, get_entrada_by_id
from bson import ObjectId
from datetime import datetime

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para Produto
async def create_produto(produto: Produto):
    # normalize tags: ensure we link existing tags or create as needed
    normalized_tags = []
    for t in produto.tags:
        # Case: already a dict with _id
        if isinstance(t, dict) and t.get('_id'):
            tag_doc = await get_tag_by_id(t.get('_id'))
            if tag_doc:
                normalized_tags.append({'_id': tag_doc['_id'], 'descricao': tag_doc['descricao']})
                continue
        # Extract descricao robustly whether t is dict, str, or object with attribute
        descricao = None
        if isinstance(t, dict):
            descricao = t.get('descricao')
        elif isinstance(t, str):
            descricao = t
        else:
            descricao = getattr(t, 'descricao', None)
        if descricao:
            tag_doc = await get_or_create_tag_by_descricao(descricao)
            if tag_doc:
                normalized_tags.append({'_id': tag_doc['_id'], 'descricao': tag_doc['descricao']})

    doc = produto.dict(by_alias=True)
    doc['tags'] = normalized_tags
    doc['created_at'] = datetime.utcnow()

    # Ensure at least one item exists; if not, add default item with quantity 1 and acquisition_date = now
    from ..models.itens import Item as ItemModel
    default_item_added = False
    if not doc.get('itens'):
        default_item = ItemModel(quantity=1)
        doc['itens'] = [default_item.dict(by_alias=True)]
        default_item_added = True

    # Ensure conditional flags reflect items
    has_cond_fornecedor = any(itm.get("condicional_fornecedor_id") for itm in doc.get("itens", []))
    has_cond_cliente = any(itm.get("condicional_cliente_id") for itm in doc.get("itens", []))
    doc['em_condicional_fornecedor'] = bool(has_cond_fornecedor)
    doc['em_condicional_cliente'] = bool(has_cond_cliente)

    logging.info(f"Creating produto {doc.get('codigo_interno')}: has_cond_fornecedor={has_cond_fornecedor}, em_condicional_fornecedor={doc['em_condicional_fornecedor']}, itens={doc.get('itens')}")

    # Insert product
    result = await db.produtos.insert_one(doc)
    produto_id = result.inserted_id

    # If we added a default item, create a corresponding entrada for today
    if default_item_added:
        from ..models.entradas import Entrada as EntradaModel
        entrada_obj = EntradaModel(produtos_id=produto_id, quantidade=default_item.quantity, tipo='compra')
        entrada_id = await create_entrada(entrada_obj)
        # fetch the entrada to append to produto document
        entrada_doc = await get_entrada_by_id(entrada_id)
        if entrada_doc:
            await db.produtos.update_one({"_id": produto_id}, {"$push": {"entradas": entrada_doc}})

    # If explicit items were provided, create entradas for each item so stock is recorded in the entradas collection
    if doc.get('itens'):
        try:
            from ..models.entradas import Entrada as EntradaModel
            for itm in doc.get('itens', []):
                qty = int(itm.get('quantity', 0)) if itm.get('quantity') is not None else 0
                if qty <= 0:
                    continue
                entrada_obj = EntradaModel(produtos_id=produto_id, quantidade=qty, tipo='compra')
                entrada_id = await create_entrada(entrada_obj)
                entrada_doc = await get_entrada_by_id(entrada_id)
                if entrada_doc:
                    await db.produtos.update_one({"_id": produto_id}, {"$push": {"entradas": entrada_doc}})
        except Exception:
            # don't block creation if entradas fail; log
            import traceback
            traceback.print_exc()

    return produto_id

async def get_produtos():
    return await db.produtos.find().to_list(None)

async def get_produto_by_id(produto_id: str):
    return await db.produtos.find_one({"_id": produto_id})

async def update_produto(produto_id: str, update_data: dict):
    # If tags are provided, normalize them like in create_produto
    if update_data.get('tags') is not None:
        normalized_tags = []
        for t in update_data['tags']:
            if isinstance(t, dict) and t.get('_id'):
                tag_doc = await get_tag_by_id(t.get('_id'))
                if tag_doc:
                    normalized_tags.append({'_id': tag_doc['_id'], 'descricao': tag_doc['descricao']})
                    continue
            descricao = None
            if isinstance(t, dict):
                descricao = t.get('descricao')
            elif isinstance(t, str):
                descricao = t
            else:
                descricao = getattr(t, 'descricao', None)
            if descricao:
                tag_doc = await get_or_create_tag_by_descricao(descricao)
                if tag_doc:
                    normalized_tags.append({'_id': tag_doc['_id'], 'descricao': tag_doc['descricao']})
        update_data['tags'] = normalized_tags

    # If items are being updated, compute delta and create entrada for added quantity
    if update_data.get('itens') is not None:
        try:
            current = await db.produtos.find_one({"_id": produto_id})
            old_total = sum((i.get('quantity', 0) for i in current.get('itens', []))) if current else 0
            new_total = sum((i.get('quantity', 0) for i in update_data.get('itens', [])))
            delta = int(new_total) - int(old_total)
            if delta > 0:
                from ..models.entradas import Entrada as EntradaModel
                entrada_obj = EntradaModel(produtos_id=produto_id, quantidade=delta, tipo='compra')
                entrada_id = await create_entrada(entrada_obj)
                entrada_doc = await get_entrada_by_id(entrada_id)
                if entrada_doc:
                    await db.produtos.update_one({"_id": produto_id}, {"$push": {"entradas": entrada_doc}})
        except Exception:
            import traceback
            traceback.print_exc()

    update_data['updated_at'] = datetime.utcnow()
    return await db.produtos.find_one_and_update(
        {"_id": produto_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_produto(produto_id: str):
    return await db.produtos.delete_one({"_id": produto_id})

async def can_delete_produto(produto_id: str):
    produto = await db.produtos.find_one({"_id": produto_id}, projection={"em_condicional_fornecedor": 1, "em_condicional_cliente": 1})
    if produto is None:
        return None
    return not (produto.get("em_condicional_fornecedor") or produto.get("em_condicional_cliente"))

# Agregações para Produto
async def get_produto_com_entradas(produto_id: str):
    pipeline = [
        {"$match": {"_id": produto_id}},
        {"$lookup": {"from": "entradas", "localField": "_id", "foreignField": "produtos_id", "as": "entradas"}}
    ]
    return await db.produtos.aggregate(pipeline).to_list(None)

async def get_produto_com_saidas(produto_id: str):
    pipeline = [
        {"$match": {"_id": produto_id}},
        {"$lookup": {"from": "saidas", "localField": "_id", "foreignField": "produtos_id", "as": "saidas"}}
    ]
    return await db.produtos.aggregate(pipeline).to_list(None)

async def get_produto_com_tudo(produto_id: str):
    pipeline = [
        {"$match": {"_id": produto_id}},
        {"$lookup": {"from": "entradas", "localField": "_id", "foreignField": "produtos_id", "as": "entradas"}},
        {"$lookup": {"from": "saidas", "localField": "_id", "foreignField": "produtos_id", "as": "saidas"}}
    ]
    return await db.produtos.aggregate(pipeline).to_list(None)

# Filtro por tags
async def get_produtos_by_tags(tag_ids: list, mode: str = 'OR'):
    """Retorna produtos que correspondem às tags fornecidas.

    mode: 'AND' requer que o produto possua todas as tags (interseção),
    'OR' requer que possua qualquer uma das tags (união).
    """
    mode = (mode or 'OR').upper()
    if mode not in ('AND', 'OR'):
        mode = 'OR'

    if mode == 'AND':
        match_stage = {"tags._id": {"$all": tag_ids}}
    else:
        match_stage = {"tags._id": {"$in": tag_ids}}

    pipeline = [
        {"$match": match_stage},
        {"$lookup": {"from": "tags", "localField": "tags._id", "foreignField": "_id", "as": "tags_completas"}},
        {"$addFields": {
            "tags": {
                "$map": {
                    "input": "$tags",
                    "as": "t",
                    "in": {
                        "$mergeObjects": [
                            "$$t",
                            {"tag": {"$arrayElemAt": ["$tags_completas", {"$indexOfArray": ["$tags_completas._id", "$$t._id"]}]}}
                        ]
                    }
                }
            }
        }},
        {"$project": {"tags_completas": 0}}
    ]
    return await db.produtos.aggregate(pipeline).to_list(None)

# Busca por texto (descrição)
async def search_produtos(query: str):
    regex = {"$regex": query, "$options": "i"}
    return await db.produtos.find({
        "$or": [
            {"codigo_externo": regex},
            {"marca_fornecedor": regex},
            {"sessao": regex},
            {"codigo_interno": regex},
            {"descricao": regex},
            {"tags.descricao": regex}
        ]
    }).to_list(None)

# Verifica existência de código interno
async def exists_codigo_interno(codigo_interno: str, exclude_id: str | None = None):
    query = {"codigo_interno": codigo_interno}
    if exclude_id:
        query["_id"] = {"$ne": exclude_id}
    existing = await db.produtos.find_one(query)
    return existing is not None

# Retorna o último codigo_interno (baseado em created_at) e o próximo sugerido
async def get_last_codigo_interno():
    last = await db.produtos.find().sort("created_at", -1).limit(1).to_list(1)
    if not last:
        return None
    last_code = last[0].get('codigo_interno')
    return last_code