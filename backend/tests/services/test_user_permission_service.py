import pytest
from app.models.user_permission import UserPermission
from app.models.role import Permission, PermissionType
from app.services import user_permission as user_permission_service
from datetime import datetime
from app.models.organization import Organization


@pytest.fixture
def test_permission(db_session):
    perm = Permission(
        name=PermissionType.VIEW_USERS,
        display_name="View Users",
        description="Test perm",
        category="user_management",
    )
    db_session.add(perm)
    db_session.commit()
    db_session.refresh(perm)
    return perm


@pytest.fixture
def test_organization(db_session):
    org = Organization(name="Test Org", slug="test-org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def test_user(db_session, test_organization):
    from app.models.user import User

    user = User(
        organization_id=test_organization.id,
        github_id="12345",
        github_username="testuser",
        email="testuser@example.com",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_assign_user_permission(db_session, test_user, test_permission):
    up = await user_permission_service.assign_user_permission(
        db_session, test_user.id, test_permission.id
    )
    assert up.user_id == test_user.id
    assert up.permission_id == test_permission.id
    assert up.is_active


@pytest.mark.asyncio
async def test_assign_duplicate_user_permission(db_session, test_user, test_permission):
    up1 = await user_permission_service.assign_user_permission(
        db_session, test_user.id, test_permission.id
    )
    up2 = await user_permission_service.assign_user_permission(
        db_session, test_user.id, test_permission.id
    )
    assert up1.id == up2.id
    assert up2.is_active


@pytest.mark.asyncio
async def test_revoke_user_permission(db_session, test_user, test_permission):
    await user_permission_service.assign_user_permission(
        db_session, test_user.id, test_permission.id
    )
    revoked = await user_permission_service.revoke_user_permission(
        db_session, test_user.id, test_permission.id
    )
    assert revoked
    up = (
        db_session.query(UserPermission)
        .filter_by(user_id=test_user.id, permission_id=test_permission.id)
        .first()
    )
    assert up is not None
    assert not up.is_active


@pytest.mark.asyncio
async def test_revoke_nonexistent_user_permission(
    db_session, test_user, test_permission
):
    revoked = await user_permission_service.revoke_user_permission(
        db_session, test_user.id, test_permission.id
    )
    assert not revoked


@pytest.mark.asyncio
async def test_list_user_permissions(db_session, test_user, test_permission):
    await user_permission_service.assign_user_permission(
        db_session, test_user.id, test_permission.id
    )
    perms = await user_permission_service.list_user_permissions(
        db_session, test_user.id
    )
    assert any(p.id == test_permission.id for p in perms)
