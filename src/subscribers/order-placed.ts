import type { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    host: "mail.govela.vn",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: "support@govela.vn",
        pass: "S$3fmD@a",
    },
})

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const query = container.resolve("query")

    const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "display_id", "email", "total", "currency_code"],
        filters: { id: [data.id] }
    })

    const order = orders[0]

    if (!order) {
        console.warn(`Order ${data.id} not found for payment confirmed email notification`)
        return
    }

    // Standard checkout email, fallback to the one provided in snippet
    const recipient = order.email || "nihnquoccuong@gmail.com"

    const currency = order.currency_code ? String(order.currency_code).toUpperCase() : ''
    const orderId = order.display_id || order.id

    await transporter.sendMail({
        from: '"Govela" <support@govela.vn>',
        to: recipient,
        subject: `Payment Confirmed - Order #${orderId}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <div style="text-align: center; padding: 20px 0;">
          <h1 style="color: #2c3e50; margin-bottom: 5px;">Payment Confirmed</h1>
          <p style="color: #7f8c8d; font-size: 16px; margin-top: 0;">Thank you for shopping with Govela.</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="font-size: 18px; color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Summary</h2>
          <p><strong>Order ID:</strong> #${orderId}</p>
          <p><strong>Total Amount:</strong> ${order.total.toFixed(2)} ${currency}</p>
        </div>
        <p>Your payment has been successfully processed, and we are currently preparing your order for shipment. We will send you another update once your order has been dispatched.</p>
        <p>If you have any questions or concerns regarding your order, please do not hesitate to contact our customer support.</p>
        <div style="margin-top: 30px; font-size: 14px; color: #7f8c8d; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
          <p>Best regards,<br><strong>The Govela Team</strong></p>
          <p><a href="mailto:support@govela.vn" style="color: #3498db; text-decoration: none;">support@govela.vn</a></p>
        </div>
      </div>
    `
    })

    console.log(`Sent order confirmation email to ${recipient} for order ${orderId}`)
}

export const config: SubscriberConfig = {
    event: "order.placed",
}
