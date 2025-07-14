from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    oauth,
    saml,
    sso,
    pipelines,
    kubernetes,
    enhanced_kubernetes,
    terraform,
    ansible,
    alerts,
    costs,
    websocket,
    metrics,
    git_activity,
    git_webhooks,
    roles,
    teams,
    team_collaboration,
    notifications,
    permissions,
    audit_log,
    audit,
    push_tokens,
    cache,
    monitoring,
)
from app.api.v1 import webhooks

from .endpoints import infrastructure

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(oauth.router, prefix="/auth/oauth", tags=["OAuth 2.0"])
api_router.include_router(saml.router, prefix="/auth/saml", tags=["SAML 2.0"])
api_router.include_router(sso.router, prefix="/auth/sso", tags=["SSO Management"])
api_router.include_router(roles.router, prefix="/roles", tags=["Role Management"])
api_router.include_router(teams.router, prefix="/teams", tags=["Team Management"])
api_router.include_router(team_collaboration.router, prefix="/collaborations", tags=["Team Collaboration"])
api_router.include_router(
    pipelines.router, prefix="/pipelines", tags=["CI/CD Pipelines"]
)
api_router.include_router(kubernetes.router, prefix="/kubernetes", tags=["Kubernetes"])
api_router.include_router(
    enhanced_kubernetes.router, prefix="/kubernetes", tags=["Enhanced Kubernetes"]
)
api_router.include_router(
    terraform.router, prefix="/terraform", tags=["Infrastructure"]
)
api_router.include_router(ansible.router, prefix="/ansible", tags=["Automation"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(costs.router, prefix="/costs", tags=["Cost Analysis"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["Notifications"]
)
api_router.include_router(
    push_tokens.router, prefix="/push-tokens", tags=["Push Notifications"]
)
api_router.include_router(
    websocket.router, prefix="/realtime", tags=["Real-time Updates"]
)
api_router.include_router(metrics.router, tags=["Monitoring"])
api_router.include_router(git_activity.router, prefix="/git", tags=["Git Activity"])
api_router.include_router(
    git_webhooks.router, prefix="/git-webhooks", tags=["Git Webhooks"]
)
api_router.include_router(
    webhooks.router, prefix="/webhooks", tags=["webhooks"]
)
api_router.include_router(
    permissions.router, prefix="/permissions", tags=["Permission Management"]
)
api_router.include_router(audit_log.router)
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Logs"])
api_router.include_router(cache.router, prefix="/cache", tags=["Cache Management"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["Monitoring & Observability"])
api_router.include_router(infrastructure.router)
