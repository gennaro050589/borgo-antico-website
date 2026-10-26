exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const bodyData = JSON.parse(event.body);
        
        // Haal customer en cart netjes uit de binnengekomen data
        const customer = bodyData.customer || bodyData;
        const cart = bodyData.cart || [];
        
        const resendApiKey = process.env.RESEND_API_KEY;

        if (!resendApiKey) {
            throw new Error("RESEND_API_KEY ontbreekt in de Netlify instellingen.");
        }

        // Bouw de lijst met bestelde gerechten voor in de e-mail
        let itemsHtml = cart.map(item => `
            <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <b>${item.quantity}x</b> ${item.name}
                    ${item.note ? `<br><span style="font-size: 12px; color: #666; font-style: italic;">Opmerking: ${item.note}</span>` : ''}
                </td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: top;">
                    € ${(item.price * item.quantity).toFixed(2).replace('.', ',')}
                </td>
            </tr>
        `).join('');

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                <h2 style="color: #b45309; text-align: center; margin-top: 0;">Borgo Antico - Orderbevestiging</h2>
                <p>Beste <b>${customer.name}</b>,</p>
                <p>Bedankt voor je bestelling! We hebben deze in goede orde ontvangen.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                
                <h3 style="font-size: 16px; color: #111; margin-bottom: 10px;">Besteldetails:</h3>
                <p style="margin: 4px 0;"><b>Type bestelling:</b> ${customer.type ? customer.type.toUpperCase() : ''}</p>
                <p style="margin: 4px 0;"><b>Gewenste tijd:</b> ${customer.date} om ${customer.time}</p>
                <p style="margin: 4px 0;"><b>Betaalwijze:</b> ${customer.payment}</p>
                ${customer.type === 'bezorgen' ? `<p style="margin: 4px 0;"><b>Bezorgadres:</b> ${customer.street}, ${customer.zip} ${customer.city}</p>` : `<p style="margin: 4px 0;"><b>Afhaallocatie:</b> Dorpsstraat 63, Zevenhuizen</p>`}
                ${customer.driverNote ? `<p style="margin: 4px 0;"><b>Opmerking:</b> ${customer.driverNote}</p>` : ''}
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                
                <h3 style="font-size: 16px; color: #111; margin-bottom: 10px;">Bestelde gerechten:</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    ${itemsHtml || '<tr><td colspan="2">Geen gerechten gevonden</td></tr>'}
                </table>
                
                <p style="margin-top: 30px; font-size: 12px; color: #778; text-align: center;">Borgo Antico Zevenhuizen | 0180-632688</p>
            </div>
        `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: 'Borgo Antico <orders@borgoantico.online>',
                to: [customer.email, 'info@borgoantico.nl'],
                subject: `Nieuwe Bestelling van ${customer.name} - Borgo Antico`,
                html: emailHtml
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Fout bij verzenden');

        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};