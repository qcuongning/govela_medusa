import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    host: "mail.govela.vn",
    port: 587,
    secure: false,
    auth: {
        user: "support@govela.vn",
        pass: "S$3fmD@a",
    },
})

export default async function paymentCapturedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const query = container.resolve("query")

    // In payment.captured, data.id is the payment ID.
    // We need to find the order associated with this payment.
    const { data: payments } = await query.graph({
        entity: "payment",
        fields: ["id", "amount", "currency_code", "payment_collection.order.id", "payment_collection.order.display_id", "payment_collection.order.email"],
        filters: { id: [data.id] }
    })

    const payment = payments[0]
    const order = payment?.payment_collection?.order

    if (!order) {
        console.warn(`Order not found for payment ${data.id}`)
        return
    }

    const recipient = order.email
    const currency = payment.currency_code ? String(payment.currency_code).toUpperCase() : ''
    const orderId = order.display_id || order.id

    await transporter.sendMail({
        from: '"Govela" <support@govela.vn>',
        to: recipient,
        subject: `Payment Confirmed - Order #${orderId}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #2c3e50; margin-bottom: 5px;">Payment Confirmed</h1>
          <p style="color: #7f8c8d; font-size: 16px; margin-top: 0;">Your payment for Order #${orderId} has been successfully received.</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>Order ID:</strong> #${orderId}</p>
          <p><strong>Paid Amount:</strong> ${payment.amount.toFixed(2)} ${currency}</p>
        </div>
        <p>We are now processing your order and will notify you as soon as it is shipped.</p>
        <p>Thank you for choosing Govela!</p>
        <div style="margin-top: 30px; font-size: 14px; color: #7f8c8d; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
          <p>Best regards,<br><strong>The Govela Team</strong></p>
          <p><a href="mailto:support@govela.vn" style="color: #3498db; text-decoration: none;">support@govela.vn</a></p>
        </div>
      </div>
    `
    })

    console.log(`Sent payment confirmation email to ${recipient} for order ${orderId}`)
}

export const config: SubscriberConfig = {
    event: "payment.captured",
}
