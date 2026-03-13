
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from .models import Categorie, Transaction, AlerteBudget
from .serializers import (
    RegisterSerializer, UserSerializer,
    CategorieSerializer, TransactionSerializer,
    AlerteBudgetSerializer, PasswordResetSerializer
)
from rest_framework import generics, viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.http import HttpResponse
from datetime import datetime
import openpyxl
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from .models import Categorie, Transaction
from .serializers import RegisterSerializer, UserSerializer, CategorieSerializer, TransactionSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


class CategorieViewSet(viewsets.ModelViewSet):
    serializer_class = CategorieSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Categorie.objects.filter(utilisateur=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Transaction.objects.filter(utilisateur=self.request.user)
        type_filter = self.request.query_params.get('type')
        categorie_id = self.request.query_params.get('categorie')
        mois = self.request.query_params.get('mois')
        annee = self.request.query_params.get('annee')
        if type_filter:
            qs = qs.filter(type=type_filter)
        if categorie_id:
            qs = qs.filter(categorie_id=categorie_id)
        if mois:
            qs = qs.filter(date__month=mois)
        if annee:
            qs = qs.filter(date__year=annee)
        return qs


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_view(request):
    transactions = Transaction.objects.filter(utilisateur=request.user)
    mois = request.query_params.get('mois')
    annee = request.query_params.get('annee')
    if mois:
        transactions = transactions.filter(date__month=mois)
    if annee:
        transactions = transactions.filter(date__year=annee)
    total_revenus = transactions.filter(type='revenu').aggregate(total=Sum('montant'))['total'] or 0
    total_depenses = transactions.filter(type='depense').aggregate(total=Sum('montant'))['total'] or 0
    return Response({
        'total_revenus': total_revenus,
        'total_depenses': total_depenses,
        'solde': total_revenus - total_depenses,
        'nb_transactions': transactions.count(),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_excel(request):
    transactions = Transaction.objects.filter(utilisateur=request.user)
    mois = request.query_params.get('mois')
    annee = request.query_params.get('annee')
    if mois:
        transactions = transactions.filter(date__month=mois)
    if annee:
        transactions = transactions.filter(date__year=annee)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Transactions"
    ws.append(['ID', 'Type', 'Montant', 'Catégorie', 'Description', 'Date'])

    for t in transactions:
        ws.append([
            t.id,
            t.type,
            float(t.montant),
            t.categorie.nom if t.categorie else '',
            t.description,
            t.date.strftime('%d/%m/%Y'),
        ])

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=transactions.xlsx'
    wb.save(response)
    return response


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_pdf(request):
    transactions = Transaction.objects.filter(utilisateur=request.user)
    mois = request.query_params.get('mois')
    annee = request.query_params.get('annee')
    if mois:
        transactions = transactions.filter(date__month=mois)
    if annee:
        transactions = transactions.filter(date__year=annee)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename=transactions.pdf'

    p = canvas.Canvas(response, pagesize=A4)
    width, height = A4
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, height - 50, "MoneyWise - Rapport de transactions")
    p.setFont("Helvetica", 10)
    p.drawString(50, height - 70, f"Utilisateur: {request.user.email}")
    p.drawString(50, height - 85, f"Généré le: {datetime.now().strftime('%d/%m/%Y %H:%M')}")

    total_revenus = transactions.filter(type='revenu').aggregate(total=Sum('montant'))['total'] or 0
    total_depenses = transactions.filter(type='depense').aggregate(total=Sum('montant'))['total'] or 0
    solde = total_revenus - total_depenses

    p.setFont("Helvetica-Bold", 11)
    p.drawString(50, height - 110, f"Total Revenus: {total_revenus} FCFA")
    p.drawString(50, height - 125, f"Total Dépenses: {total_depenses} FCFA")
    p.drawString(50, height - 140, f"Solde: {solde} FCFA")

    y = height - 170
    p.setFont("Helvetica-Bold", 10)
    p.drawString(50, y, "Date")
    p.drawString(150, y, "Type")
    p.drawString(230, y, "Montant")
    p.drawString(320, y, "Catégorie")
    p.drawString(430, y, "Description")
    y -= 15

    p.setFont("Helvetica", 9)
    for t in transactions:
        if y < 50:
            p.showPage()
            y = height - 50
        p.drawString(50, y, t.date.strftime('%d/%m/%Y'))
        p.drawString(150, y, t.type)
        p.drawString(230, y, str(t.montant))
        p.drawString(320, y, t.categorie.nom if t.categorie else '')
        p.drawString(430, y, t.description[:20])
        y -= 15

    p.save()
    return response


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def rapport_mensuel(request):
    mois = request.query_params.get('mois', datetime.now().month)
    annee = request.query_params.get('annee', datetime.now().year)
    transactions = Transaction.objects.filter(
        utilisateur=request.user,
        date__month=mois,
        date__year=annee
    )
    total_revenus = transactions.filter(type='revenu').aggregate(total=Sum('montant'))['total'] or 0
    total_depenses = transactions.filter(type='depense').aggregate(total=Sum('montant'))['total'] or 0

    categories = Categorie.objects.filter(utilisateur=request.user)
    repartition = []
    for cat in categories:
        montant = transactions.filter(categorie=cat, type='depense').aggregate(total=Sum('montant'))['total'] or 0
        if montant > 0:
            repartition.append({'categorie': cat.nom, 'montant': montant})

    return Response({
        'mois': mois,
        'annee': annee,
        'total_revenus': total_revenus,
        'total_depenses': total_depenses,
        'solde': total_revenus - total_depenses,
        'nb_transactions': transactions.count(),
        'repartition_par_categorie': repartition,
    })
    # ── MOT DE PASSE OUBLIÉ ───────────────────────────────────
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_request(request):
    serializer = PasswordResetSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email']
    user = User.objects.get(email=email)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_link = f"http://localhost:3000/reset-password/{uid}/{token}/"
    return Response({
        'message': 'Lien de réinitialisation généré.',
        'reset_link': reset_link
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_confirm(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception:
        return Response({'error': 'Lien invalide.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Token expiré ou invalide.'}, status=status.HTTP_400_BAD_REQUEST)

    new_password = request.data.get('new_password')
    if not new_password or len(new_password) < 6:
        return Response({'error': 'Mot de passe trop court.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Mot de passe modifié avec succès.'})


# ── ALERTES BUDGET ────────────────────────────────────────
class AlerteBudgetViewSet(viewsets.ModelViewSet):
    serializer_class = AlerteBudgetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AlerteBudget.objects.filter(utilisateur=self.request.user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def verifier_alertes(request):
    from django.db.models import Sum
    alertes_dépassées = []
    alertes = AlerteBudget.objects.filter(utilisateur=request.user, actif=True)
    mois = datetime.now().month
    annee = datetime.now().year

    for alerte in alertes:
        total = Transaction.objects.filter(
            utilisateur=request.user,
            categorie=alerte.categorie,
            type='depense',
            date__month=mois,
            date__year=annee
        ).aggregate(total=Sum('montant'))['total'] or 0

        if total >= alerte.seuil:
            alertes_dépassées.append({
                'categorie': alerte.categorie.nom,
                'seuil': alerte.seuil,
                'depense_actuelle': total,
                'message': f"⚠️ Budget dépassé pour {alerte.categorie.nom} !"
            })

    return Response({
        'alertes_dépassées': alertes_dépassées,
        'nb_alertes': len(alertes_dépassées)
    })