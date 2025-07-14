import pytest
from httpx import AsyncClient, ASGITransport
from app.models.role import Permission, PermissionType, Role, SystemRole
from app.models.user import User
from app.models.user_role import UserRole
from app.core.auth.rbac import RBACContext, get_rbac_context
from app.schemas.user_permission import UserPermissionCreate, UserPermissionRevoke
import asyncio
import pytest_asyncio


@pytest_asyncio.fixture(autouse=True)
async def override_rbac_context(async_db_session_factory, test_user_with_manage_roles):
    async def _rbac_context_override(request):
        async with async_db_session_factory() as session:
            user = await session.get(User, test_user_with_manage_roles)
            yield RBACContext(user, session)

    from app.core.auth.rbac import get_rbac_context
    from app.main import app as main_app

    main_app.dependency_overrides[get_rbac_context] = _rbac_context_override
    yield
    main_app.dependency_overrides.pop(get_rbac_context, None)


@pytest_asyncio.fixture
def test_app():
    # Import app after dependency overrides are set
    from app.main import app

    return app


@pytest.mark.asyncio
async def test_assign_user_permission_api(
    test_app, async_db_session_factory, test_user_with_manage_roles, test_permission
):
    async with async_db_session_factory() as session:
        user = await session.get(User, test_user_with_manage_roles)
        permission = await session.get(Permission, test_permission)
        payload = UserPermissionCreate(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://test"
        ) as ac:
            response = await ac.post(
                f"/api/v1/permissions/users/{user.id}/permissions/assign", json=payload
            )
            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == user.id
            assert data["permission_id"] == permission.id


@pytest.mark.asyncio
async def test_assign_duplicate_user_permission_api(
    async_db_session_factory, test_user_with_manage_roles, test_permission, test_app
):
    async with async_db_session_factory() as session:
        user = await session.get(User, test_user_with_manage_roles)
        permission = await session.get(Permission, test_permission)
        payload = UserPermissionCreate(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/assign", json=payload
            )
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/assign", json=payload
            )
    if response.status_code != 200:
        print("assign_duplicate_user_permission_api error:", await response.json())
    assert response.status_code == 200
    data = await response.json()
    assert data["is_active"]


@pytest.mark.asyncio
async def test_revoke_user_permission_api(
    async_db_session_factory, test_user_with_manage_roles, test_permission, test_app
):
    async with async_db_session_factory() as session:
        user = await session.get(User, test_user_with_manage_roles)
        permission = await session.get(Permission, test_permission)
        payload = UserPermissionRevoke(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/revoke", json=payload
            )
            if response.status_code != 200:
                print(
                    "revoke_user_permission_api FAIL:",
                    response.status_code,
                    response.text,
                )
            assert response.status_code == 200
            data = await response.json()
            assert data["success"] is True


@pytest.mark.asyncio
async def test_revoke_nonexistent_user_permission_api(
    async_db_session_factory, test_user, test_permission, test_app
):
    async with async_db_session_factory() as session:
        user = await session.get(User, test_user)
        permission = await session.get(Permission, test_permission)
        payload = UserPermissionRevoke(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/revoke", json=payload
            )
    assert response.status_code in (404, 200)  # Accept 404 for not found


@pytest.mark.asyncio
async def test_list_user_permissions_api(
    async_db_session_factory, test_user, test_permission, test_app
):
    async with async_db_session_factory() as session:
        user = await session.get(User, test_user)
        permission = await session.get(Permission, test_permission)
        payload = UserPermissionCreate(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Assign permission first
            response = await client.post(
                f"/api/v1/permissions/users/{user.id}/permissions/assign", json=payload
            )
            if response.status_code != 200:
                print(
                    "list_user_permissions_api (assign) FAIL:",
                    response.status_code,
                    response.text,
                )
            assert response.status_code == 200
            # List permissions
            response = await client.get(
                f"/api/v1/permissions/users/{user.id}/permissions?organization_id={user.organization_id}"
            )
            if response.status_code != 200:
                print(
                    "list_user_permissions_api (list) FAIL:",
                    response.status_code,
                    response.text,
                )
            assert response.status_code == 200
            data = await response.json()
            assert any(p["id"] == permission.id for p in data)


@pytest.mark.asyncio
async def test_minimal_body_parse(
    async_db_session_factory, test_user_with_manage_roles, test_permission, test_app
):
    async with async_db_session_factory() as session:
        user = await session.get(User, test_user_with_manage_roles)
        permission = await session.get(Permission, test_permission)
        payload = UserPermissionCreate(
            user_id=user.id,
            permission_id=permission.id,
            organization_id=user.organization_id,
        ).model_dump()
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/permissions/test-body-parse", json=payload
            )
            print("test_minimal_body_parse:", response.status_code, response.text)
            assert response.status_code == 200
