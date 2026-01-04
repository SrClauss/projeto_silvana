from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from pymongo import ObjectId
from bcrypt import hashpw, gensalt

class User(BaseModel):
    id = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    name: str
    email: str
    hashed_password: str
    role: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


    def set_password(self, name, value):
        self.hashed_password = hashpw(value.encode('utf-8'), gensalt()).decode('utf-8')

    def verify_password(self,value):
        if not self.hashed_password:
            return False
        return hashpw(value.encode('utf-8'), self.hashed_password.encode('utf-8')) == self.hashed_password.encode('utf-8')
    
    class Config:
        allow_population_by_field_name = True
        fields = {"hashed_password": {"exclude": True}}

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
