'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Stripe configuration
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key');

const StripePaymentForm = ({ amount, bookingId, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get payment intent from backend
      const token = typeof window !== "undefined" ? localStorage.getItem("npw_token") : null;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/${bookingId}/payment/initiate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          booking_id: bookingId,
          amount: amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Payment initiation failed: ${response.status} ${errorData}`);
      }

      const { client_secret, payment_id } = await response.json();

      // Confirm the payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: 'Customer',
          },
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        // Verify payment with backend
        const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bookings/payment/${payment_id}/verify/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            payment_intent_id: paymentIntent.id,
          }),
        });

        if (verifyResponse.ok) {
          onSuccess?.(paymentIntent);
        } else {
          throw new Error('Payment verification failed');
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err.message || 'Payment failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Card Details</label>
        <div className="p-3 border rounded-md bg-white">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={loading || !stripe}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay Rs. ${amount}`
        )}
      </Button>
    </form>
  );
};

export default function StripePayment({ amount, bookingId, onSuccess, onError }) {
  return (
    <Elements stripe={stripePromise}>
      <StripePaymentForm 
        amount={amount} 
        bookingId={bookingId} 
        onSuccess={onSuccess} 
        onError={onError} 
      />
    </Elements>
  );
}