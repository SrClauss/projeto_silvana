
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from bson import ObjectId

class Tag(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    descricao: str
    descricao_case_insensitive: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    @validator('descricao_case_insensitive', pre=True, always=True)
    def set_descricao_case_insensitive(cls, v, values):
        if 'descricao' in values:
            return values['descricao'].lower()
        return v.lower() if v else ""

    class Config:
        populate_by_name = True