import { NextResponse } from 'next/server';
import { PaymentService } from '@/app/_lib/services/payment-service';

export async function POST() {
    try {
        const order = await PaymentService.createOrder();
        return NextResponse.json(order);
    } catch (error) {
        console.error('Payment error:', error);
        return NextResponse.json(
            { error: 'Payment processing failed' },
            { status: 500 }
        );
    }
}
