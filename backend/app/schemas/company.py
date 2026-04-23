# app/schemas/company.py
from pydantic import BaseModel, EmailStr
from datetime import datetime


class CompanyRegister(BaseModel):
    name:     str
    email:    EmailStr
    password: str


class CompanyLogin(BaseModel):
    email:    EmailStr
    password: str


class CompanyOut(BaseModel):
    id:         int
    name:       str
    email:      str
    plan:       str
    is_active:  bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    company:      CompanyOut
