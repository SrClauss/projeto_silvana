
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

    @validator('descricao')
    def descricao_no_spaces(cls, v):
        if v is None:
            raise ValueError('descricao is required')
        v_str = str(v).strip()
        if not v_str:
            raise ValueError('descricao is required')
        import re
        if re.search(r"\s", v_str):
            raise ValueError('descricao cannot contain spaces')
        return v_str

    class Config:
        populate_by_name = True