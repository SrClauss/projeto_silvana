import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def migrate_tags():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    db = client["projeto_silvana"]
    tags = await db.tags.find().to_list(None)
    for tag in tags:
        if 'descricao_case_insensitive' not in tag or not tag.get('descricao_case_insensitive'):
            await db.tags.update_one(
                {"_id": tag["_id"]},
                {"$set": {"descricao_case_insensitive": tag["descricao"].lower()}}
            )
    print("Migração concluída")

if __name__ == "__main__":
    asyncio.run(migrate_tags())