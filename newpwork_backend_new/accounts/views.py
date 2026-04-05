from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from decimal import Decimal
from django.db.models import Count, Q, Sum
from .models import User, UserRole, KYCVerification, Notification
from django.conf import settings
from services.service_models import Service
from bookings.models import Booking, Payment
from django.db import models
from django.contrib.auth import authenticate
from django.utils import timezone
from .serializers import KYCVerificationSerializer, UserSerializer, NotificationSerializer
import jwt
import secrets
import hashlib
from datetime import datetime, timedelta
from django.core.cache import cache
from django.contrib.auth.hashers import make_password

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login with email/password and return JWT token"""
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password required"}, status=status.HTTP_400_BAD_REQUEST)

    # Use Django's authenticate with email (need to authenticate using username field)
    try:
        user = User.objects.get(email=email)
        # Check password manually since authenticate requires username
        if not user.check_password(password):
            return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)
    except User.DoesNotExist:
        return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)

    # Generate JWT token
    secret = getattr(settings, "NEXTAUTH_SECRET", settings.SECRET_KEY)
    payload = {
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, secret, algorithm="HS256")

    return Response({
        "token": token,
        "user": {
            "email": user.email,
            "name": user.display_name or user.username,
            "role": user.role,
            "image": user.avatar_url
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def token_by_email(request):
    """Issue a JWT for an existing user identified by email.

    This is used to mint a backend token for users who signed in via
    third-party providers (e.g., Google) through NextAuth and therefore
    don't have a password-based login token stored.
    """
    email = (request.data.get("email") or "").strip()
    if not email:
        return Response({"error": "Email required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    secret = getattr(settings, "NEXTAUTH_SECRET", settings.SECRET_KEY)
    payload = {
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, secret, algorithm="HS256")

    return Response({
        "token": token,
        "user": {
            "email": user.email,
            "name": user.display_name or user.username,
            "role": user.role,
            "image": user.avatar_url
        }
    })


def validate_password(password):
    """Validate password strength: 8+ chars, uppercase, lowercase, number, special char"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    if not has_upper:
        return False, "Password must contain at least one uppercase letter"
    if not has_lower:
        return False, "Password must contain at least one lowercase letter"
    if not has_digit:
        return False, "Password must contain at least one number"
    if not has_special:
        return False, "Password must contain at least one special character"
    
    return True, None


def normalize_np_mobile(raw):
    digits = "".join(c for c in (raw or "") if c.isdigit())
    if len(digits) == 13 and digits.startswith("977"):
        digits = digits[3:]
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10 and digits[:2] in ("98", "97", "96"):
        return digits
    return None


def can_book_budget_tier(user):
    if getattr(user, "phone_verified", False):
        return True
    if getattr(user, "is_email_verified", False):
        return True
    if getattr(user, "google_id", None):
        return True
    return False


def profile_complete_for_premium_booking(user):
    name = (user.display_name or "").strip()
    phone = (user.phone_number or "").strip()
    addr = (user.address or "").strip()
    return bool(name and phone and addr)


def validate_email(email):
    """Validate email format"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, "Please enter a valid email address"
    return True, None


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user"""
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "")
    username = request.data.get("username", "").strip() or email.split("@")[0] if email else ""
    role = request.data.get("role", UserRole.CUSTOMER)
    category = request.data.get("category")

    if not email or not password:
        return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    if role == UserRole.PROVIDER and category:
        from .models import ProviderCategory
        if category not in ProviderCategory.values:
            return Response({"error": f"Invalid category. Must be one of: {', '.join(ProviderCategory.values)}"}, status=status.HTTP_400_BAD_REQUEST)

    # Validate email
    is_valid_email, email_error = validate_email(email)
    if not is_valid_email:
        return Response({"error": email_error}, status=status.HTTP_400_BAD_REQUEST)

    # Validate password
    is_valid_password, password_error = validate_password(password)
    if not is_valid_password:
        return Response({"error": password_error}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({"error": "An account with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        role=role,
        category=category if role == UserRole.PROVIDER else None,
        is_email_verified=True,
    )

    # Generate JWT token
    secret = getattr(settings, "NEXTAUTH_SECRET", settings.SECRET_KEY)
    payload = {
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(payload, secret, algorithm="HS256")

    return Response({
        "token": token,
        "user": {
            "email": user.email,
            "name": user.display_name or user.username,
            "role": user.role,
            "image": user.avatar_url
        },
        "message": "Account created successfully!"
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def client_register_start(request):
    """Part 1 — Step A: name, phone, password only; stores pending registration and issues OTP (dev: logged + debug_otp)."""
    name = (request.data.get("name") or "").strip()
    phone = normalize_np_mobile(request.data.get("phone") or request.data.get("phone_number") or "")
    password = request.data.get("password") or ""

    if len(name) < 2:
        return Response({"detail": "Name is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not phone:
        return Response(
            {"detail": "Enter a valid Nepal mobile number (10 digits starting with 98, 97, or 96)."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    ok, pwd_err = validate_password(password)
    if not ok:
        return Response({"detail": pwd_err}, status=status.HTTP_400_BAD_REQUEST)

    email = f"{phone}@phone.npw.local"
    if User.objects.filter(Q(phone_number=phone) | Q(email=email)).exists():
        return Response({"detail": "An account with this phone already exists."}, status=status.HTTP_400_BAD_REQUEST)

    otp = f"{secrets.randbelow(900000) + 100000:06d}"
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    cache.set(
        f"client_reg:{phone}",
        {"name": name, "phone": phone, "password_hash": make_password(password), "otp_hash": otp_hash},
        timeout=600,
    )
    print(f"[CLIENT_REG_OTP] {phone} -> {otp}")
    body = {"message": "OTP sent. Enter it to finish sign-up."}
    if settings.DEBUG:
        body["debug_otp"] = otp
    return Response(body, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def client_register_confirm(request):
    """Part 1 — Step B: phone + OTP; creates customer and returns JWT."""
    phone = normalize_np_mobile(request.data.get("phone") or request.data.get("phone_number") or "")
    otp = (request.data.get("otp") or "").strip()
    if not phone or not otp:
        return Response({"detail": "Phone and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

    key = f"client_reg:{phone}"
    data = cache.get(key)
    if not data:
        return Response({"detail": "Code expired or not found. Start again from step one."}, status=status.HTTP_400_BAD_REQUEST)
    if hashlib.sha256(otp.encode()).hexdigest() != data["otp_hash"]:
        return Response({"detail": "Invalid OTP."}, status=status.HTTP_400_BAD_REQUEST)

    email = f"{phone}@phone.npw.local"
    if User.objects.filter(email=email).exists():
        cache.delete(key)
        return Response({"detail": "Account already exists."}, status=status.HTTP_400_BAD_REQUEST)

    user = User(
        username=f"c_{phone}",
        email=email,
        display_name=data["name"],
        phone_number=phone,
        phone_verified=True,
        role=UserRole.CUSTOMER,
        category=None,
        is_email_verified=False,
    )
    user.password = data["password_hash"]
    user.save()

    cache.delete(key)

    secret = getattr(settings, "NEXTAUTH_SECRET", settings.SECRET_KEY)
    payload = {
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow(),
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    return Response(
        {
            "token": token,
            "user": {
                "email": user.email,
                "name": user.display_name or user.username,
                "role": user.role,
                "image": user.avatar_url,
            },
            "message": "Account created.",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def patch_my_profile(request):
    """Update address / display name / phone for premium-tier booking eligibility."""
    import re

    user = request.user
    if "address" in request.data:
        user.address = (request.data.get("address") or "").strip()
    if "display_name" in request.data:
        user.display_name = (request.data.get("display_name") or "").strip()
    if "phone_number" in request.data:
        raw = (request.data.get("phone_number") or "").strip()
        if raw and not re.match(r"^(98|97|96)\d{8}$", raw):
            return Response({"detail": "Invalid Nepal phone format."}, status=status.HTTP_400_BAD_REQUEST)
        user.phone_number = raw
    user.save()
    return Response(
        {
            "display_name": user.display_name,
            "phone_number": user.phone_number,
            "address": user.address,
            "profile_complete": profile_complete_for_premium_booking(user),
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def sync_user(request):
    import logging
    logger = logging.getLogger(__name__)
    
    email = request.data.get("email")
    username = request.data.get("username")
    role = request.data.get("role")

    if not email:
        return Response({"error": "Email required"}, status=status.HTTP_400_BAD_REQUEST)

    user, created = User.objects.get_or_create(
        email=email, defaults={"username": username or email.split("@")[0]}
    )
    
    logger.info(f"sync_user called for {email}, created={created}, current_role={user.role}, requested_role={role}")

    if not created and username and user.username != username:
        user.username = username
        user.save()

    # Elevate to admin if matches ADMIN_EMAIL (only if not already set to another role)
    admin_email = getattr(settings, "ADMIN_EMAIL", None)
    if admin_email and user.email == admin_email:
        # Only set to admin if email matches admin email exactly
        if user.role != UserRole.ADMIN:
            logger.info(f"Elevating {email} to admin (matches ADMIN_EMAIL)")
            user.role = UserRole.ADMIN
            user.save()
    # Update role if provided and valid.
    elif role in dict(UserRole.choices).keys():
        if user.role != UserRole.ADMIN:
            # We allow users to have the PROVIDER role even without KYC verification
            # so they can access their dashboard and set up their profile.
            # Actual service posting/visibility is restricted in specific views.
            
            # PROTECT PROVIDER ROLE: If it's a request to switch roles, allow it.
            # We used to prevent downgrade to prevent 403s, but now we handle it.
            if user.role != role:
                logger.info(f"Updating role for {email} from {user.role} to {role}")
                user.role = role
                user.save()
            
            # If category is provided for a provider, update it
            category = request.data.get("category")
            if user.role == UserRole.PROVIDER and category:
                from .models import ProviderCategory
                if category in ProviderCategory.values:
                    user.category = category
                    user.save()

    logger.info(f"sync_user completed for {email}, final_role={user.role}")
    return Response({"message": "User synced", "created": created, "role": user.role})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_status(request):
    """Get current user's status including role and KYC verification."""
    user = request.user
    has_kyc = hasattr(user, 'kyc_verification')
    kyc_status = user.kyc_verification.status if has_kyc else "not_submitted"
    kyc_verified = has_kyc and user.kyc_verification.is_verified
    
    # NEW: Check if business certificate exists
    has_trade_cert = has_kyc and bool(user.kyc_verification.trade_certificate)
    
    # Force unverified if trade certificate is missing for any provider
    if user.role == UserRole.PROVIDER and not has_trade_cert and kyc_verified:
        # Silently invalidate verified status if trade cert is missing
        kyc_verified = False
        kyc_status = "pending" # Force back to pending/update
        user.kyc_verification.status = "pending"
        user.kyc_verification.save()

    return Response({
        "id": user.id,
        "email": user.email,
        "name": user.display_name or user.username,
        "image": user.avatar_url,
        "role": user.role,
        "freshness_guarantee": bool(getattr(user, "freshness_guarantee", False)),
        "freshness_violations": getattr(user, "freshness_violations", 0),
        "is_provider": user.role == UserRole.PROVIDER,
        "phone_verified": getattr(user, "phone_verified", False),
        "is_email_verified": getattr(user, "is_email_verified", False),
        "profile_complete": profile_complete_for_premium_booking(user),
        "address": getattr(user, "address", "") or "",
        "phone_number": getattr(user, "phone_number", "") or "",
        "has_kyc": has_kyc,
        "kyc_status": kyc_status,
        "kyc_verified": kyc_verified,
        "has_trade_cert": has_trade_cert,
        "can_post_services": user.role == UserRole.PROVIDER and kyc_verified and has_trade_cert,
        "issues": [
            issue for issue in [
                "User role is not 'provider'" if user.role != UserRole.PROVIDER else None,
                "KYC not submitted" if not has_kyc else None,
                "Trade/Business certificate missing" if user.role == UserRole.PROVIDER and not has_trade_cert else None,
                f"KYC status is '{kyc_status}' (needs to be 'approved')" if has_kyc and not kyc_verified else None,
            ] if issue
        ]
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """Return basic admin statistics."""
    # Ensure user is admin
    if getattr(request.user, 'role', None) != UserRole.ADMIN:
        return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

    total_users = User.objects.count()
    providers_count = User.objects.filter(role=UserRole.PROVIDER).count()
    verified_count = KYCVerification.objects.filter(status=KYCVerification.Status.APPROVED).count()
    
    # eSewa (and most flows) update Booking.payment_status, not legacy Payment rows
    paid_booking_statuses = (
        Booking.BookingPaymentStatus.HELD,
        Booking.BookingPaymentStatus.RELEASED,
    )
    agg = Booking.objects.filter(payment_status__in=paid_booking_statuses).aggregate(
        total=Sum("commission_amount")
    )
    total_revenue = agg["total"] if agg["total"] is not None else Decimal("0")
    # Stripe / legacy: successful Payment rows whose booking is not yet in paid booking states
    legacy = Decimal("0")
    for p in Payment.objects.filter(status="success").select_related("booking"):
        b = p.booking
        if b.payment_status not in paid_booking_statuses and (p.commission_amount or 0) > 0:
            legacy += p.commission_amount or Decimal("0")

    data = {
        "total_users": total_users,
        "providers_count": providers_count,
        "verified_count": verified_count,
        "total_revenue": str(total_revenue + legacy),
    }
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats(request):
    """Return basic admin statistics."""
    total_users = User.objects.count()
    total_customers = User.objects.filter(role=UserRole.CUSTOMER).count()
    total_providers = User.objects.filter(role=UserRole.PROVIDER).count()
    total_services = Service.objects.filter(is_active=True).count()
    total_bookings = Booking.objects.count()
    active_bookings = Booking.objects.filter(status=Booking.Status.CONFIRMED).count()
    # Compute commission-based revenue from successful payments
    successful_payments = Payment.objects.filter(status='success')
    total_revenue = sum(p.commission_amount for p in successful_payments)
    
    data = {
        "total_users": total_users,
        "customers": total_customers,
        "providers": total_providers,
        "services": total_services,
        "bookings": total_bookings,
        "active_bookings": active_bookings,
        # Return as string to avoid Decimal serialization issues
        "revenue": str(total_revenue),
    }
    return Response(data)


def _provider_earnings_npr(qs):
    """Sum provider-side earnings for bookings with funds held or released."""
    paid_ps = (
        Booking.BookingPaymentStatus.HELD,
        Booking.BookingPaymentStatus.RELEASED,
    )
    total = Decimal("0")
    rows = qs.filter(payment_status__in=paid_ps).values_list(
        "provider_payout_amount", "amount_paid", "commission_amount"
    )
    for payout, paid, comm in rows:
        if payout is not None:
            total += payout
        elif paid is not None and comm is not None:
            total += paid - comm
        elif paid is not None:
            total += paid
    return total


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """Return user-specific dashboard statistics."""
    user = request.user
    
    if getattr(user, "role", None) == UserRole.PROVIDER:
        # Provider stats
        my_services = Service.objects.filter(provider=user).count()
        active_services = Service.objects.filter(provider=user, is_active=True).count()
        provider_bookings = Booking.objects.filter(service__provider=user)
        my_bookings = provider_bookings.count()
        pending_bookings = provider_bookings.filter(status=Booking.Status.PENDING).count()
        confirmed_bookings = provider_bookings.filter(status=Booking.Status.CONFIRMED).count()
        completed_bookings = provider_bookings.filter(status=Booking.Status.COMPLETED).count()
        total_earned = _provider_earnings_npr(provider_bookings)
        
        # Calculate average rating
        completed_with_ratings = Booking.objects.filter(
            service__provider=user, 
            status=Booking.Status.COMPLETED,
            rating__isnull=False
        )
        avg_rating = completed_with_ratings.aggregate(avg=models.Avg('rating'))['avg'] or 0
        
        data = {
            # Dashboard cards (aligned with frontend)
            "bookings_count": my_bookings,
            "services_count": active_services,
            "total_earned": str(total_earned.quantize(Decimal("0.01"))),
            # Legacy / detail fields
            "total_services": my_services,
            "total_bookings": my_bookings,
            "pending_bookings": pending_bookings,
            "confirmed_bookings": confirmed_bookings,
            "completed_bookings": completed_bookings,
            "average_rating": round(avg_rating, 1),
        }
    elif getattr(user, "role", None) == UserRole.CUSTOMER:
        # Customer bookings (exclude self-booking own service edge case)
        cust_bookings = Booking.objects.filter(customer=user).exclude(service__provider=user)
        all_count = cust_bookings.count()
        pending_bookings = cust_bookings.filter(status=Booking.Status.PENDING).count()
        confirmed_bookings = cust_bookings.filter(status=Booking.Status.CONFIRMED).count()
        completed_bookings = cust_bookings.filter(status=Booking.Status.COMPLETED).count()
        active_bookings_count = cust_bookings.filter(
            status__in=(Booking.Status.PENDING, Booking.Status.CONFIRMED)
        ).count()
        
        data = {
            "bookings_count": all_count,
            "active_bookings_count": active_bookings_count,
            "services_count": 0,
            "total_earned": "0",
            "total_bookings": all_count,
            "pending_bookings": pending_bookings,
            "confirmed_bookings": confirmed_bookings,
            "completed_bookings": completed_bookings,
            "active_bookings": confirmed_bookings,
        }
    else:
        # Admin stats (same as public stats)
        data = {
            "total_users": User.objects.count(),
            "customers": User.objects.filter(role=UserRole.CUSTOMER).count(),
            "providers": User.objects.filter(role=UserRole.PROVIDER).count(),
            "services": Service.objects.filter(is_active=True).count(),
            "bookings": Booking.objects.count(),
            "active_bookings": Booking.objects.filter(status=Booking.Status.CONFIRMED).count(),
        }
    
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_kyc(request):
    """Submit KYC verification documents."""
    # Debug logging - print to console for immediate visibility
    import logging
    logger = logging.getLogger('accounts')
    
    print("=" * 50)
    print("[KYC SUBMIT] Request received")
    print(f"User: {request.user}")
    print(f"Authenticated: {request.user.is_authenticated if request.user else False}")
    print(f"Method: {request.method}")
    print(f"Content-Type: {request.content_type}")
    print(f"Has FILES: {bool(request.FILES)}")
    print(f"Files keys: {list(request.FILES.keys()) if request.FILES else []}")
    print(f"Request data keys: {list(request.data.keys()) if hasattr(request, 'data') else 'No data attr'}")
    print("=" * 50)
    
    try:
        logger.info(f"KYC submission request received. User: {request.user}, Method: {request.method}")
        logger.info(f"Content-Type: {request.content_type}")
        logger.info(f"Has files: {bool(request.FILES)}")
        logger.info(f"Files: {list(request.FILES.keys())}")
    except Exception as e:
        print(f"[KYC] Error in logging: {e}")
        logger.error(f"Error in logging: {e}")
    
    # Ensure user is authenticated
    if not request.user or not request.user.is_authenticated:
        print("[KYC] ERROR: User not authenticated")
        logger.warning("Unauthenticated KYC submission attempt")
        return Response(
            {"detail": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    user = request.user
    context = {"request": request}
    
    # Log request data (without files)
    try:
        data_keys = list(request.data.keys()) if hasattr(request, 'data') else []
        print(f"[KYC] Request data keys: {data_keys}")
        logger.info(f"Request data keys: {data_keys}")
    except Exception as e:
        print(f"[KYC] Error logging request data: {e}")
        logger.error(f"Error logging request data: {e}")

    if hasattr(user, 'kyc_verification'):
        kyc = user.kyc_verification

        if kyc.status == KYCVerification.Status.APPROVED:
            return Response(
                {
                    "detail": "Your KYC is already verified.",
                    "status": kyc.status,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if kyc.status == KYCVerification.Status.PENDING:
            return Response(
                {
                    "detail": "Your KYC is already under review.",
                    "status": kyc.status,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Allow resubmission on rejection
        serializer = KYCVerificationSerializer(kyc, data=request.data, context=context)
        if serializer.is_valid():
            # NEW: Business certificate is now mandatory for ALL provider roles
            if not request.FILES.get("trade_certificate") and not kyc.trade_certificate:
                return Response({"detail": "Trade/Business Certificate is now mandatory for all service providers."}, status=status.HTTP_400_BAD_REQUEST)

            # Validate phone number
            phone_number = request.data.get("phone_number", "").strip()
            import re
            if phone_number and not re.match(r'^(98|97|96)\d{8}$', phone_number):
                return Response({"detail": "Invalid Nepal phone number. Must be 10 digits starting with 98, 97, or 96."}, status=status.HTTP_400_BAD_REQUEST)

            category = request.data.get("category", "flower_vendor")
            previous_notes = kyc.admin_notes
            serializer.save(
                status=KYCVerification.Status.PENDING,
                admin_notes=previous_notes,
                verified_at=None,
                verified_by=None,
                email=user.email,
                category=category
            )
            # Update user's phone number if provided
            phone_number = request.data.get("phone_number")
            if phone_number:
                user.phone_number = phone_number
                user.save(update_fields=["phone_number"])

            _notify_admins_of_kyc_submission(user, resubmitted=True)

            return Response(
                {
                    "message": "KYC resubmitted successfully. Your details are back in the verification queue.",
                    "status": serializer.instance.status,
                    "kyc": KYCVerificationSerializer(serializer.instance, context=context).data,
                    "previous_admin_notes": previous_notes,
                },
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        serializer = KYCVerificationSerializer(data=request.data, context=context)
        if serializer.is_valid():
            # NEW: Business certificate is now mandatory for ALL provider roles
            if not request.FILES.get("trade_certificate"):
                return Response({"detail": "Trade/Business Certificate is now mandatory for all service providers."}, status=status.HTTP_400_BAD_REQUEST)

            # Validate phone number
            phone_number = request.data.get("phone_number", "").strip()
            import re
            if phone_number and not re.match(r'^(98|97|96)\d{8}$', phone_number):
                return Response({"detail": "Invalid Nepal phone number. Must be 10 digits starting with 98, 97, or 96."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                category = request.data.get("category", "flower_vendor")
                instance = serializer.save(user=user, email=user.email, category=category)

                phone_number = request.data.get("phone_number")
                if phone_number:
                    user.phone_number = phone_number
                    user.save(update_fields=["phone_number"])

                _notify_admins_of_kyc_submission(user, resubmitted=False)

                return Response(
                    {
                        "message": "KYC submitted successfully. We will notify you after verification.",
                        "status": instance.status,
                        "kyc": KYCVerificationSerializer(instance, context=context).data,
                    },
                    status=status.HTTP_201_CREATED,
                )
            except Exception as e:
                logger.error(f"Error saving KYC: {str(e)}", exc_info=True)
                import traceback
                logger.error(traceback.format_exc())
                return Response(
                    {"detail": f"Error saving KYC: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        logger.warning(f"KYC serializer validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Unexpected error in submit_kyc: {str(e)}", exc_info=True)
        import traceback
        logger.error(traceback.format_exc())
        return Response(
            {"detail": f"Unexpected error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _notify_admins_of_kyc_submission(user: User, resubmitted: bool = False) -> None:
    """Create notifications for admins and the submitting user when KYC is (re)submitted."""
    title = "KYC Resubmitted" if resubmitted else "New KYC Submission"
    message = (
        f"{user.display_name or user.email} has resubmitted their KYC details for review."
        if resubmitted
        else f"{user.display_name or user.email} has submitted a new KYC request."
    )

    admins = User.objects.filter(role=UserRole.ADMIN)
    notifications = [
        Notification(
            user=admin,
            notification_type=Notification.Type.KYC_SUBMITTED,
            title=title,
            message=message,
            related_service_id=None,
            related_booking_id=None,
        )
        for admin in admins
    ]
    Notification.objects.bulk_create(notifications)

    Notification.objects.create(
        user=user,
        notification_type=Notification.Type.KYC_SUBMITTED,
        title="KYC sent for verification",
        message="Your KYC documents have been sent to the admin for verification. You will be notified once a decision is made.",
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_kyc_status(request):
    """Get current user's KYC status."""
    user = request.user
    
    if not hasattr(user, 'kyc_verification'):
        return Response({
            "status": "not_submitted",
            "is_verified": False
        })
    
    serializer = KYCVerificationSerializer(user.kyc_verification, context={"request": request})
    return Response({
        "status": user.kyc_verification.status,
        "status_display": user.kyc_verification.get_status_display(),
        "is_verified": user.kyc_verification.is_verified,
        "admin_notes": user.kyc_verification.admin_notes,
        "kyc": serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_pending_kyc(request):
    """List pending KYC verifications (admin only)."""
    user = request.user
    
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response(
            {"detail": "Only admins can view pending KYC verifications."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    pending_kyc = KYCVerification.objects.filter(status=KYCVerification.Status.PENDING)
    serializer = KYCVerificationSerializer(pending_kyc, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_kyc(request):
    """Admin-only: list KYC verifications by status (?status=pending|approved|rejected|all)."""
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Only admins can view KYC verifications."}, status=status.HTTP_403_FORBIDDEN)
    
    status_param = (request.GET.get("status") or "all").lower()
    qs = KYCVerification.objects.all().order_by('-updated_at')
    
    if status_param in (KYCVerification.Status.PENDING, KYCVerification.Status.APPROVED, KYCVerification.Status.REJECTED):
        qs = qs.filter(status=status_param)
    
    serializer = KYCVerificationSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_kyc(request, kyc_id: int):
    """Verify or reject KYC (admin only)."""
    user = request.user
    
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response(
            {"detail": "Only admins can verify KYC."},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        kyc = KYCVerification.objects.get(id=kyc_id)
    except KYCVerification.DoesNotExist:
        return Response(
            {"detail": "KYC verification not found."},
            status=status.HTTP_404_NOT_FOUND
        )
    
    action = request.data.get("action")  # "approve" or "reject"
    notes = request.data.get("admin_notes", "")
    
    if action == "approve":
        kyc.status = KYCVerification.Status.APPROVED
        kyc.verified_at = timezone.now()
        kyc.verified_by = user
        kyc.admin_notes = notes
        kyc.save()

        Notification.objects.create(
            user=kyc.user,
            notification_type=Notification.Type.KYC_APPROVED,
            title="KYC Approved",
            message="Congratulations! Your KYC verification has been approved. You can now start posting services on NepWork.",
        )
    elif action == "reject":
        notes = (notes or "").strip()
        if not notes:
            return Response(
                {"detail": "Admin notes are required when rejecting a KYC."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        kyc.status = KYCVerification.Status.REJECTED
        kyc.verified_at = timezone.now()
        kyc.verified_by = user
        kyc.admin_notes = notes
        kyc.save()

        Notification.objects.create(
            user=kyc.user,
            notification_type=Notification.Type.KYC_REJECTED,
            title="KYC Rejected",
            message=f"Your KYC verification was rejected. Reason: {notes}",
        )
    else:
        return Response(
            {"detail": "Invalid action. Use 'approve' or 'reject'."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = KYCVerificationSerializer(kyc, context={"request": request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """Admin-only: list all users with stats."""
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Only admins can view users."}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        qs = User.objects.all().order_by('-date_joined')
        
        data = []
        for u in qs[:200]:  # simple cap
            kyc_status = "not_submitted"
            is_verified = False
            if hasattr(u, 'kyc_verification'):
                kyc_status = u.kyc_verification.status
                is_verified = u.kyc_verification.status == KYCVerification.Status.APPROVED
            
            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "category": u.category,
                "is_active": u.is_active,
                "is_verified": is_verified,
                "kyc_status": kyc_status,
                "services_count": 0,
                "bookings_count": 0,
                "date_joined": u.date_joined.isoformat() if u.date_joined else None,
            })
        return Response(data)
    except Exception as e:
        import traceback
        print(f"ERROR in list_users: {e}")
        print(traceback.format_exc())
        return Response({"detail": f"Internal Server Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id: int):
    """Admin-only: delete a user account."""
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Only admins can delete users."}, status=status.HTTP_403_FORBIDDEN)
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    # Prevent self-delete
    if target.id == user.id:
        return Response({"detail": "Admins cannot delete themselves."}, status=status.HTTP_400_BAD_REQUEST)
    target.delete()
    return Response({"message": "User deleted"})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def set_user_active(request, user_id: int):
    """Admin-only: activate/deactivate a user. Body: {"active": true|false}"""
    user = request.user
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Only admins can modify users."}, status=status.HTTP_403_FORBIDDEN)
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    if target.id == user.id:
        return Response({"detail": "Admins cannot change their own active status."}, status=status.HTTP_400_BAD_REQUEST)
    active = request.data.get("active")
    if isinstance(active, bool) is False:
        return Response({"detail": "'active' boolean required"}, status=status.HTTP_400_BAD_REQUEST)
    target.is_active = bool(active)
    target.save()
    return Response({"id": target.id, "is_active": target.is_active})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    """Get all notifications for the authenticated user."""
    notifications = Notification.objects.filter(user=request.user)
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id: int):
    """Mark a notification as read."""
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
    except Notification.DoesNotExist:
        return Response({"detail": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)
    notification.is_read = True
    notification.save()
    return Response(NotificationSerializer(notification).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Mark all notifications as read for the authenticated user."""
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({"message": "All notifications marked as read"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_notifications_count(request):
    """Get count of unread notifications."""
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({"unread_count": count})


@api_view(['GET'])
@permission_classes([AllowAny])
def list_providers(request):
    """List verified providers by category (public)"""
    from django.core.paginator import Paginator
    from .models import ProviderCategory
    
    # Filter for providers
    queryset = User.objects.filter(role=UserRole.PROVIDER)
    
    # If any provider is fully approved, prefer verified partners—but still include providers
    # who have at least one active service so the directory matches bookable listings.
    has_approved = User.objects.filter(role=UserRole.PROVIDER, kyc_verification__status='approved').exists()
    if has_approved:
        queryset = queryset.filter(
            Q(kyc_verification__status='approved') | Q(service_listings__is_active=True)
        ).distinct()
    
    category = request.query_params.get("category")
    if category and category in ProviderCategory.values:
        queryset = queryset.filter(category=category)
    
    search = request.query_params.get("q")
    if search:
        queryset = queryset.filter(
            Q(username__icontains=search) | 
            Q(display_name__icontains=search) |
            Q(bio__icontains=search)
        )
    
    # Sort featured first, then rating (distinct avoids duplicate rows from booking joins)
    queryset = queryset.annotate(
        service_count=Count('service_listings', filter=Q(service_listings__is_active=True)),
        avg_rating=models.Avg('service_listings__bookings__rating', filter=Q(service_listings__bookings__status=Booking.Status.COMPLETED))
    ).distinct().order_by('-is_featured', '-avg_rating', 'id')

    # Pagination
    page_size = 12
    paginator = Paginator(queryset, page_size)
    page_number = request.query_params.get('page', 1)
    page_obj = paginator.get_page(page_number)

    from accounts.response_time import format_response_time_label

    data = []
    for p in page_obj:
        is_verified = hasattr(p, 'kyc_verification') and p.kyc_verification.status == 'approved'
        data.append({
            "id": p.id,
            "name": p.display_name or p.username,
            "category": p.category,
            "profile_photo": p.avatar_url,
            "average_rating": p.avg_rating,
            "service_count": p.service_count,
            "is_featured": getattr(p, 'is_featured', False),
            "is_verified": is_verified,
            "freshness_guarantee": bool(getattr(p, "freshness_guarantee", False)),
            "avg_response_hours": getattr(p, "avg_response_hours", None),
            "response_label": format_response_time_label(getattr(p, "avg_response_hours", None)),
        })

    return Response({
        "results": data,
        "count": paginator.count,
        "num_pages": paginator.num_pages,
        "current_page": page_obj.number
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def provider_detail(request, user_id):
    """Get public details for a single verified provider"""
    from django.db.models import Count, Q
    from bookings.models import Booking
    try:
        p = User.objects.annotate(
            service_count=Count('service_listings', filter=Q(service_listings__is_active=True)),
            avg_rating=models.Avg('service_listings__bookings__rating', filter=Q(service_listings__bookings__status=Booking.Status.COMPLETED))
        ).get(id=user_id, role=UserRole.PROVIDER)
        
        from accounts.response_time import format_response_time_label

        return Response({
            "id": p.id,
            "name": p.display_name or p.username,
            "email": p.email,
            "category": p.category,
            "profile_photo": p.avatar_url,
            "average_rating": p.avg_rating,
            "service_count": p.service_count,
            "is_featured": getattr(p, 'is_featured', False),
            "phone": p.phone_number,
            "is_verified": hasattr(p, 'kyc_verification') and p.kyc_verification.is_verified,
            "freshness_guarantee": bool(getattr(p, "freshness_guarantee", False)),
            "avg_response_hours": getattr(p, "avg_response_hours", None),
            "response_label": format_response_time_label(getattr(p, "avg_response_hours", None)),
        })
    except User.DoesNotExist:
        return Response({"detail": "Provider not found"}, status=status.HTTP_404_NOT_FOUND)



@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_featured(request, user_id):
    """Admin only: Toggle featured status for a provider"""
    if getattr(request.user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        provider = User.objects.get(id=user_id, role=UserRole.PROVIDER)
        provider.is_featured = not getattr(provider, 'is_featured', False)
        provider.save()
        return Response({"id": provider.id, "is_featured": provider.is_featured})
    except User.DoesNotExist:
        return Response({"detail": "Provider not found."}, status=status.HTTP_404_NOT_FOUND)
