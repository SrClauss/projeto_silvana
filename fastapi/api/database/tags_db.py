from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.tags import Tag
import os
from bson import ObjectId
from datetime import datetime

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para Tag
async def create_tag(tag: Tag):
    result = await db.tags.insert_one(tag.dict(by_alias=True))
    return result.inserted_id

async def get_tags():
    return await db.tags.find().to_list(None)

async def get_tag_by_id(tag_id: str):
    return await db.tags.find_one({"_id": tag_id})

async def find_tags_by_query(q: str):
    regex = {"$regex": q, "$options": "i"}
    return await db.tags.find({"descricao": regex}).to_list(None)

from pymongo.errors import DuplicateKeyError

async def get_or_create_tag_by_descricao(descricao: str):
    # busca case-insensitive usando descricao_case_insensitive
    if not descricao:
        return None
    descricao_norm = str(descricao).strip()
    existing = await db.tags.find_one({"descricao_case_insensitive": descricao_norm.lower()})
    if existing:
        return existing
    tag = Tag(descricao=descricao_norm)  # Usa o modelo para popular automaticamente
    try:
        result = await db.tags.insert_one(tag.dict(by_alias=True))
        inserted = await db.tags.find_one({"_id": result.inserted_id})
        return inserted
    except DuplicateKeyError:
        # Another request inserted the same tag concurrently — fetch existing
        existing = await db.tags.find_one({"descricao_case_insensitive": descricao_norm.lower()})
        return existing

async def update_tag(tag_id: str, update_data: dict):
    return await db.tags.find_one_and_update(
        {"_id": tag_id}, {"$set": update_data}, return_document=ReturnDocument.AFTER
    )

async def delete_tag(tag_id: str):
    # Remover a tag de todos os produtos que a possuem
    await db.produtos.update_many(
        {"tags._id": tag_id},
        {"$pull": {"tags": {"_id": tag_id}}}
    )
    
    # Deletar a tag
    return await db.tags.delete_one({"_id": tag_id})