from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from bcrypt import hashpw, gensalt
from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    VENDEDOR = "vendedor"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    name: str
    email: str
    hashed_password: str
    role: Role
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


    def set_password(self, name, value):
        self.hashed_password = hashpw(value.encode('utf-8'), gensalt()).decode('utf-8')

    def verify_password(self,value):
        if not self.hashed_password:
            return False
        return hashpw(value.encode('utf-8'), self.hashed_password.encode('utf-8')) == self.hashed_password.encode('utf-8')
    
    class Config:
        populate_by_name = True

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Role

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
