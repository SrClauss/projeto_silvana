from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.tags import Tag
import os

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