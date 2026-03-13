from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Categorie, Transaction

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'date_creation', 'is_staff']

@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ['nom', 'type', 'utilisateur']

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['utilisateur', 'type', 'montant', 'categorie', 'date']