from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, me_view,
    CategorieViewSet, TransactionViewSet,
    dashboard_view, export_excel, export_pdf, rapport_mensuel,
    AlerteBudgetViewSet, verifier_alertes,
    password_reset_request, password_reset_confirm
)

router = DefaultRouter()
router.register(r'categories', CategorieViewSet, basename='categorie')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'alertes', AlerteBudgetViewSet, basename='alerte')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', me_view, name='me'),
    path('auth/password-reset/', password_reset_request, name='password_reset'),
    path('auth/password-reset/<uidb64>/<token>/', password_reset_confirm, name='password_reset_confirm'),
    path('dashboard/', dashboard_view, name='dashboard'),
    path('export/excel/', export_excel, name='export_excel'),
    path('export/pdf/', export_pdf, name='export_pdf'),
    path('rapport/mensuel/', rapport_mensuel, name='rapport_mensuel'),
    path('alertes/verifier/', verifier_alertes, name='verifier_alertes'),
    path('', include(router.urls)),
]