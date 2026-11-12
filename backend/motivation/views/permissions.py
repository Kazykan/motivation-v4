from rest_framework import permissions


class OnboardedUserPermission(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        if getattr(request, "auth", None) == "bff-service":
            return True
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and user.role)


class ServiceOrUserPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            return True
        if getattr(request, "auth", None) == "bff-service":
            return True
        return False


def _is_bff(request) -> bool:
    return getattr(request, "auth", None) == "bff-service"


def _is_authenticated(request) -> bool:
    user = getattr(request, "user", None)
    return bool(user and getattr(user, "is_authenticated", False))
