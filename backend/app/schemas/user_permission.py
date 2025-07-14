from typing import Optional
from pydantic import BaseModel


class UserPermissionBase(BaseModel):
    user_id: int
    permission_id: int
    organization_id: Optional[int] = None


class UserPermissionCreate(UserPermissionBase):
    pass


class UserPermissionRevoke(UserPermissionBase):
    pass


class UserPermissionOut(UserPermissionBase):
    is_active: bool

    class Config:
        orm_mode = True
