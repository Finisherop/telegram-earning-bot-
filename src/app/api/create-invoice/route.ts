import { NextRequest, NextResponse } from 'next/server';

interface InvoiceRequest {
  amount: number;
  description: string;
  tier: 'vip1' | 'vip2';
  userId: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: InvoiceRequest = await request.json();
    const { amount, description, tier, userId } = body;

    console.log('Creating invoice for:', { amount, description, tier, userId });

    // Telegram Bot Token (add to your environment variables)
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 500 }
      );
    }

    // Create invoice using Telegram Bot API
    const invoiceData = {
      title: `${tier.toUpperCase()} Subscription`,
      description: description,
      payload: JSON.stringify({
        tier: tier,
        userId: userId,
        timestamp: Date.now()
      }),
      provider_token: '', // Empty for Stars payment
      currency: 'XTR', // Telegram Stars currency
      prices: [
        {
          label: `${tier.toUpperCase()} - 30 days`,
          amount: amount // Amount in Stars
        }
      ],
      max_tip_amount: 0,
      suggested_tip_amounts: [],
      provider_data: JSON.stringify({
        receipt: {
          items: [
            {
              description: `${tier.toUpperCase()} Subscription - 30 days`,
              quantity: '1',
              amount: {
                value: amount,
                currency: 'XTR'
              }
            }
          ]
        }
      }),
      photo_url: 'https://via.placeholder.com/512x512/0088cc/ffffff?text=VIP',
      photo_size: 512,
      photo_width: 512,
      photo_height: 512,
      need_name: false,
      need_phone_number: false,
      need_email: false,
      need_shipping_address: false,
      send_phone_number_to_provider: false,
      send_email_to_provider: false,
      is_flexible: false
    };

    // Call Telegram Bot API to create invoice
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      }
    );

    const telegramResult = await telegramResponse.json();
    
    console.log('Telegram API response:', telegramResult);

    if (telegramResult.ok) {
      return NextResponse.json({
        success: true,
        invoiceUrl: telegramResult.result,
        invoiceData: invoiceData
      });
    } else {
      console.error('Telegram API error:', telegramResult);
      return NextResponse.json(
        { 
          error: 'Failed to create invoice',
          details: telegramResult.description 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}