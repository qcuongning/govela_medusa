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
    console.log(`Order placed subscriber triggered for order: ${data.id}`)

    const query = container.resolve("query")

    const { data: orders } = await query.graph({
        entity: "order",
        fields: [
            "id",
            "display_id",
            "email",
            "total",
            "currency_code",
            "payment_collections.payments.provider_id"
        ],
        filters: { id: [data.id] }
    })

    const order = orders[0]

    if (!order) {
        console.warn(`Order ${data.id} not found for notification`)
        return
    }

    const recipient = order.email || "nihnquoccuong@gmail.com"
    const currency = order.currency_code ? String(order.currency_code).toUpperCase() : ''
    const orderId = order.display_id || order.id

    console.log(`Preparing to send email to ${recipient} for order ${orderId}`)

    // Check if it's a manual payment
    const isManual = order.payment_collections?.some((pc: any) =>
        pc.payments?.some((p: any) => p.provider_id === 'pp_system_default')
    )

    const bankDetailsHtml = `
      <div style="background-color: #fff9e6; border-left: 4px solid #f1c40f; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #856404;">Bank Transfer Instructions</h3>
        <p style="margin-bottom: 5px;">Please transfer the total amount to complete your order:</p>
        <div style="font-family: monospace; background: white; padding: 10px; border: 1px solid #ffeeba;">
          <strong>Beneficiary:</strong> DINH VAN HAI<br>
          <strong>Bank:</strong> VIETCOMBANK<br>
          <strong>Account Number:</strong> 123456789<br>
          <strong>Description:</strong> Order #${orderId}
        </div>
        <p style="margin-top: 10px; font-size: 13px;">Your order will be processed as soon as we confirm your payment.</p>
      </div>
    `

    try {
        const totalFormatted = order.total != null ? Number(order.total).toFixed(2) : "N/A"
        await transporter.sendMail({
            from: '"Govela" <support@govela.vn>',
            to: recipient,
            subject: isManual ? `Payment Instructions - Order #${orderId}` : `Order Confirmation - Order #${orderId}`,
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <div style="text-align: center; padding: 20px 0;">
              <h1 style="color: #2c3e50; margin-bottom: 5px;">${isManual ? 'Order Received' : 'Order Confirmation'}</h1>
              <p style="color: #7f8c8d; font-size: 16px; margin-top: 0;">Thank you for shopping with Govela.</p>
            </div>
            
            ${isManual ? bankDetailsHtml : ''}

            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="font-size: 18px; color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Summary</h2>
              <p><strong>Order ID:</strong> #${orderId}</p>
              <p><strong>Total Amount:</strong> ${totalFormatted} ${currency}</p>
            </div>
            
            <p>${isManual 
                ? 'We have received your order. Please complete the bank transfer as described above so we can begin processing it.' 
                : 'Your order has been confirmed and we are currently preparing it for shipment. We will send you another update once your order has been dispatched.'}</p>
            
            <p>If you have any questions or concerns regarding your order, please do not hesitate to contact our customer support.</p>
            <div style="margin-top: 30px; font-size: 14px; color: #7f8c8d; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
              <p>Best regards,<br><strong>The Govela Team</strong></p>
              <p><a href="mailto:support@govela.vn" style="color: #3498db; text-decoration: none;">support@govela.vn</a></p>
            </div>
          </div>
        `
        })
        console.log(`Successfully sent email to ${recipient} for order ${orderId}`)
    } catch (error) {
        console.error(`Failed to send email to ${recipient} for order ${orderId}:`, error)
    }
}

export const config: SubscriberConfig = {
    event: "order.placed",
}
