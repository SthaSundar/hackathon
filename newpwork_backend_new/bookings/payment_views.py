from django.utils import timezone
from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import stripe
import uuid

from .models import Booking, Payment
from .serializers import BookingSerializer, PaymentSerializer
from accounts.models import User, UserRole, Notification


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment(request, booking_id: int):
    """Initiate payment for a completed booking using Stripe."""
    user = request.user
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if booking.customer_id != user.id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    
    # Check if booking is completed and unpaid
    if booking.status != Booking.Status.COMPLETED:
        return Response({"detail": "Only completed bookings can be paid."}, status=status.HTTP_400_BAD_REQUEST)
    
    if booking.payment_status in (Booking.BookingPaymentStatus.HELD, Booking.BookingPaymentStatus.RELEASED):
        return Response({"detail": "This booking has already been paid."}, status=status.HTTP_400_BAD_REQUEST)
    
    # Calculate amounts
    amount = booking.service.base_price
    commission_rate = Decimal('0.10')  # 10% commission
    commission_amount = amount * commission_rate
    provider_amount = amount - commission_amount
    
    # Convert to cents for Stripe (1 NPR = 100 cents)
    amount_cents = int(amount * 100)
    
    try:
        # Initialize Stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        # Create payment intent with Stripe
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency='npr',  # Nepali Rupees
            metadata={
                'booking_id': booking_id,
                'user_id': user.id,
                'commission_amount': str(commission_amount),
                'provider_amount': str(provider_amount)
            }
        )
        
        # Create payment record
        payment = Payment.objects.create(
            booking=booking,
            amount=amount,
            commission_amount=commission_amount,
            payment_method='stripe',
            status='pending',
            transaction_id=payment_intent.id
        )
        
        # Return payment details for Stripe integration
        return Response({
            "payment_id": payment.id,
            "client_secret": payment_intent.client_secret,
            "amount": str(amount),
            "commission_amount": str(commission_amount),
            "provider_amount": str(provider_amount),
            "transaction_id": payment.transaction_id,
            "booking": BookingSerializer(booking, context={"request": request}).data,
            "stripe_publishable_key": getattr(settings, 'STRIPE_PUBLISHABLE_KEY', None)
        })
        
    except stripe.error.StripeError as e:
        return Response({
            "detail": "Stripe error occurred.",
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({
            "detail": "Payment initiation failed.",
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request, payment_id: int):
    """Verify payment with Stripe and update booking status."""
    user = request.user
    try:
        payment = Payment.objects.get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if payment.booking.customer_id != user.id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    
    if payment.status != 'pending':
        return Response({"detail": "Payment has already been processed."}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get Stripe verification data
    payment_intent_id = request.data.get('payment_intent_id')
    
    if not payment_intent_id:
        return Response({"detail": "Payment intent ID is required."}, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify with Stripe API
    stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', None)
    if not stripe.api_key:
        return Response({"detail": "Stripe configuration error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    try:
        # Retrieve payment intent from Stripe
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status == 'succeeded':
            # Payment successful
            
            # Update payment record
            payment.status = 'success'
            payment.completed_at = timezone.now()
            payment.gateway_response = {
                'payment_intent_id': payment_intent.id,
                'amount': payment_intent.amount,
                'currency': payment_intent.currency,
                'status': payment_intent.status
            }
            payment.save()
            
            # Update booking payment status
            booking = payment.booking
            booking.payment_status = Booking.BookingPaymentStatus.RELEASED
            booking.amount_paid = payment.amount
            booking.commission_amount = payment.commission_amount
            booking.payment_completed_at = timezone.now()
            booking.save()
            
            # Create notification for provider
            Notification.objects.create(
                user=booking.service.provider,
                notification_type=Notification.Type.BOOKING_COMPLETED,
                title="Payment Received",
                message=f"Payment of Rs. {payment.amount - payment.commission_amount} has been received for '{booking.service.title}'. Commission: Rs. {payment.commission_amount}",
                related_booking_id=booking.id
            )
            
            return Response({
                "detail": "Payment verified successfully.",
                "payment": {
                    "id": payment.id,
                    "status": payment.status,
                    "amount": str(payment.amount),
                    "commission_amount": str(payment.commission_amount),
                    "provider_amount": str(payment.amount - payment.commission_amount)
                },
                "booking": BookingSerializer(booking, context={"request": request}).data
            })
        else:
            # Payment failed or pending
            payment.status = 'failed' if payment_intent.status == 'canceled' else 'pending'
            payment.gateway_response = {
                'payment_intent_id': payment_intent.id,
                'status': payment_intent.status,
                'error': getattr(payment_intent, 'last_payment_error', None)
            }
            payment.save()
            
            # Update booking payment status
            booking = payment.booking
            if payment_intent.status == "canceled":
                booking.payment_status = (
                    Booking.BookingPaymentStatus.UNPAID
                    if booking.status == Booking.Status.COMPLETED
                    else Booking.BookingPaymentStatus.NOT_DUE
                )
                booking.save(update_fields=["payment_status"])
            else:
                booking.save()
            
            return Response({
                "detail": f"Payment {payment_intent.status}.",
                "error": getattr(payment_intent, 'last_payment_error', None)
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except stripe.error.StripeError as e:
        return Response({
            "detail": "Stripe error occurred.",
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({
            "detail": "Payment verification failed.",
            "error": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_status(request, booking_id: int):
    """Get payment status for a booking."""
    user = request.user
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
    
    # Check permissions
    if booking.customer_id != user.id and booking.service.provider_id != user.id:
        return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
    
    # Get latest payment for this booking
    payment = Payment.objects.filter(booking=booking).order_by('-created_at').first()
    
    if not payment:
        return Response({
            "booking_id": booking_id,
            "payment_status": "not_initiated",
            "has_payment": False
        })
    
    return Response({
        "booking_id": booking_id,
        "payment_status": booking.payment_status,
        "has_payment": True,
        "payment": {
            "id": payment.id,
            "status": payment.status,
            "amount": str(payment.amount),
            "commission_amount": str(payment.commission_amount),
            "provider_amount": str(payment.amount - payment.commission_amount),
            "payment_method": payment.payment_method,
            "transaction_id": payment.transaction_id,
            "created_at": payment.created_at,
            "completed_at": payment.completed_at
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def provider_earnings(request):
    """Get provider earnings after commission deductions."""
    user = request.user
    
    if getattr(user, "role", None) != UserRole.PROVIDER:
        return Response({"detail": "Only providers can access earnings data."}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all completed bookings with successful payments for this provider
    completed_bookings = Booking.objects.filter(
        service__provider=user,
        status=Booking.Status.COMPLETED,
        payment_status=Booking.BookingPaymentStatus.RELEASED,
    )
    
    total_earnings = sum(
        (booking.amount_paid - booking.commission_amount) 
        for booking in completed_bookings 
        if booking.amount_paid and booking.commission_amount
    )
    
    total_commission = sum(
        booking.commission_amount 
        for booking in completed_bookings 
        if booking.commission_amount
    )
    
    recent_earnings = []
    for booking in completed_bookings.order_by('-payment_completed_at')[:10]:
        recent_earnings.append({
            "booking_id": booking.id,
            "service_title": booking.service.title,
            "total_amount": str(booking.amount_paid),
            "commission": str(booking.commission_amount),
            "provider_earnings": str(booking.amount_paid - booking.commission_amount),
            "payment_completed_at": booking.payment_completed_at
        })
    
    # Align response keys with frontend expectations
    return Response({
        "total_earnings": str(total_earnings),
        # Frontend expects `total_commission`; keep original and add alias
        "total_commission_paid": str(total_commission),
        "total_commission": str(total_commission),
        # Provide a simple count for recent transactions to match UI text
        "recent_transactions": len(recent_earnings),
        "recent_earnings": recent_earnings
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_revenue(request):
    """Get total revenue from commissions (admin only)."""
    user = request.user
    
    if getattr(user, "role", None) != UserRole.ADMIN:
        return Response({"detail": "Only admins can access revenue data."}, status=status.HTTP_403_FORBIDDEN)
    
    # Get all successful payments
    successful_payments = Payment.objects.filter(status='success')
    
    total_revenue = sum(payment.commission_amount for payment in successful_payments)
    total_transactions = successful_payments.count()
    
    recent_transactions = []
    for payment in successful_payments.order_by('-completed_at')[:20]:
        recent_transactions.append({
            "payment_id": payment.id,
            "booking_id": payment.booking.id,
            "service_title": payment.booking.service.title,
            "provider_name": payment.booking.service.provider.display_name or payment.booking.service.provider.email,
            "customer_name": payment.booking.customer.display_name or payment.booking.customer.email,
            "total_amount": str(payment.amount),
            "commission_earned": str(payment.commission_amount),
            "completed_at": payment.completed_at
        })
    
    return Response({
        "total_revenue": str(total_revenue),
        "total_transactions": total_transactions,
        "recent_transactions": recent_transactions
    })