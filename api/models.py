from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    email = models.EmailField(unique=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email


class Categorie(models.Model):
    TYPE_CHOICES = [('revenu', 'Revenu'), ('depense', 'Dépense')]
    nom = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    icone = models.CharField(max_length=50, blank=True)
    utilisateur = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='categories', null=True, blank=True
    )

    def __str__(self):
        return f"{self.nom} ({self.type})"


class Transaction(models.Model):
    TYPE_CHOICES = [('revenu', 'Revenu'), ('depense', 'Dépense')]
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    categorie = models.ForeignKey(Categorie, on_delete=models.SET_NULL, null=True, related_name='transactions')
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.TextField(blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.type} - {self.montant} ({self.date.date()})"


class AlerteBudget(models.Model):
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alertes')
    categorie = models.ForeignKey(Categorie, on_delete=models.CASCADE, related_name='alertes')
    seuil = models.DecimalField(max_digits=10, decimal_places=2)
    actif = models.BooleanField(default=True)

    def __str__(self):
        return f"Alerte {self.categorie.nom} - {self.seuil}"