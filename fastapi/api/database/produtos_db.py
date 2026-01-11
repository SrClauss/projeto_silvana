from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.produtos import Produto
import os
from ..database.tags_db import get_or_create_tag_by_descricao, get_tag_by_id
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
    result = await db.produtos.insert_one(doc)
    return result.inserted_id

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
    update_data['updated_at'] = datetime.utcnow()
    return await db.produtos.find_one_and_update(
        {"_id": produto_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_produto(produto_id: str):
    return await db.produtos.delete_one({"_id": produto_id})

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
async def get_produtos_by_tags(tag_ids: list):
    # Require products to have all specified tags (intersection)
    pipeline = [
        {"$match": {"tags._id": {"$all": tag_ids}}},
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
            {"descricao": regex}
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