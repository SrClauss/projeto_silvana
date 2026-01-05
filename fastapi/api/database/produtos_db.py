from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.produtos import Produto
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para Produto
async def create_produto(produto: Produto):
    result = await db.produtos.insert_one(produto.dict(by_alias=True))
    return result.inserted_id

async def get_produtos():
    return await db.produtos.find().to_list(None)

async def get_produto_by_id(produto_id: str):
    return await db.produtos.find_one({"_id": produto_id})

async def update_produto(produto_id: str, update_data: dict):
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
    pipeline = [
        {"$match": {"tags._id": {"$in": tag_ids}}},
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