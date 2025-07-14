from pydantic import BaseModel
from typing import Optional


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    expires_in: Optional[int] = None


class TokenPayload(BaseModel):
    sub: Optional[int] = None
    exp: Optional[int] = None
    github_id: Optional[str] = None
    github_username: Optional[str] = None
    email: Optional[str] = None
