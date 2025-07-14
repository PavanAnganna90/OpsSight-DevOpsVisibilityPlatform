from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Modern SQLAlchemy 2.0 declarative base for models.
    """

    pass


# Import all models here so Alembic can detect them for migrations
# Example (uncomment and adjust as needed):
# from .user import User
# from .item import Item
# ...
