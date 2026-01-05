from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.users import User, UserCreate, UserUpdate
import os

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]

# CRUD para User
async def create_user(user_create: UserCreate):
    user = User(**user_create.dict())
    user.set_password(user.name, user_create.password)
    result = await db.users.insert_one(user.dict(by_alias=True, exclude={"hashed_password"}))
    return result.inserted_id

async def get_users():
    return await db.users.find().to_list(None)

async def get_user_by_email(email: str):
    return await db.users.find_one({"email": email})

async def get_user_by_id(user_id: str):
    return await db.users.find_one({"_id": user_id})

async def update_user(user_id: str, update_data: UserUpdate):
    update_dict = update_data.dict(exclude_unset=True)
    if "password" in update_data.dict(exclude_unset=True).get("password"):
        user = await get_user_by_id(user_id)
        if user:
            user_obj = User(**user)
            user_obj.set_password(user["name"], update_data.password)
            update_dict["hashed_password"] = user_obj.hashed_password
        del update_dict["password"]
    return await db.users.find_one_and_update(
        {"_id": user_id}, {"$set": update_dict}, return_document=ReturnDocument.AFTER
    )

async def delete_user(user_id: str):
    return await db.users.delete_one({"_id": user_id})