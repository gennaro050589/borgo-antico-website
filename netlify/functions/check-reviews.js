// netlify/functions/check-reviews.js
import fetch from 'node-fetch';

export const config = {
  schedule: "*/15 * * * *" // Draait elke 15 minuten automatisch op de achtergrond
};

export default async (req, context) => {
    const resendApiKey = process.env.RESEND_API_KEY || "JOUW_RESEND_API_KEY_HIER";
    const projectId = "borgo-antico-website";
    
    try {
        // 1. Haal alle orders op uit Firebase Firestore via de REST API
        const firestoreResponse = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders`);
        const firestoreData = await firestoreResponse.json();

        if (!firestoreData.documents) {
            return new Response("Geen orders gevonden.", { status: 200 });
        }

        const now = new Date();

        for (const doc of firestoreData.documents) {
            const fields = doc.fields;
            const docName = doc.name; // Volledigepad in Firestore (projects/.../documents/orders/ID)
            const docId = docName.split('/').pop();

            // Velden uitlezen uit Firestore veldstructuur
            const status = fields.status ? fields.status.stringValue : '';
            const feedbackSent = fields.feedbackSent ? fields.feedbackSent.booleanValue : false;
            const customerName = fields.customer ? fields.customer.stringValue : 'Klant';
            const customerEmail = fields.email ? fields.email.stringValue : '';
            const prepTime = fields.prepTime ? parseInt(fields.prepTime.integerValue || fields.prepTime.doubleValue || 30) : 30;
            
            // Tijdstippen bepalen
            const orderTimeString = fields.orderTime ? fields.orderTime.timestampValue : null;
            const deliveryDateString = fields.deliveryDate ? fields.deliveryDate.stringValue : null;

            if (status === 'afgerond' && !feedbackSent && customerEmail) {
                let expectedTime = new Date();
                if (deliveryDateString) {
                    expectedTime = new Date(deliveryDateString.replace(' ', 'T'));
                } else if (orderTimeString) {
                    expectedTime = new Date(new Date(orderTimeString).getTime() + prepTime * 60000);
                }

                // Bereken het verschil in minuten tussen nu en de verwachte tijd
                const diffMs = now - expectedTime;
                const diffMins = diffMs / 60000;

                // Als het tussen 55 en 75 minuten geleden is (ongeveer 1 uur na verwachte tijd)
                if (diffMins >= 55 && diffMins <= 75) {
                    
                    // 2. Verstuur de review-mail via Resend
                    const reviewEmailHtml = `
                        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                            <h2 style="color: #b45309; text-align: center; margin-top: 0;">Hoe heeft het gesmaakt, ${customerName}?</h2>
                            <p>Beste <b>${customerName}</b>,</p>
                            <p>Bedankt dat je onlangs bij Borgo Antico hebt besteld! We hopen dat je hebt genoten van je maaltijd.</p>
                            <p>Omdat we de kwaliteit en service altijd willen verbeteren, zijn we erg benieuwd naar je ervaring.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://maps.app.goo.gl/k7WycF9ko4fGfJYC7" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 10px;">⭐ Deel je review op Google</a>
                                <a href="mailto:info@borgoantico.nl?subject=Feedback%20over%20mijn%20bestelling" style="background-color: #4b5563; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 10px;">💬 Stuur privéfeedback</a>
                            </div>

                            <p style="font-size: 14px; color: #555;">Was er iets niet helemaal naar wens? Laat het ons direct weten via de knop voor privéfeedback, dan lossen we het graag persoonlijk voor je op.</p>
                            
                            <p style="margin-top: 30px; font-size: 12px; color: #778; text-align: center;">Borgo Antico Zevenhuizen | 0180-632688</p>
                        </div>
                    `;

                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${resendApiKey}`
                        },
                        body: JSON.stringify({
                            from: 'Borgo Antico <orders@borgoantico.online>',
                            to: [customerEmail],
                            subject: `Hoe was je maaltijd bij Borgo Antico?`,
                            html: reviewEmailHtml
                        })
                    });

                    // 3. Update direct in Firebase dat de feedback-mail is verzonden (zodat deze nooit dubbel wordt gestuurd)
                    await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${docId}?updateMask.fieldPaths=feedbackSent`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            fields: {
                                feedbackSent: { booleanValue: true }
                            }
                        })
                    });

                    console.log(`Review-mail verzonden voor order ${docId} naar ${customerEmail}`);
                }
            }
        }

        return new Response("Review-check succesvol uitgevoerd.", { status: 200 });
    } catch (error) {
        console.error("Fout bij achtergrondcheck reviews:", error);
        return new Response("Fout bij uitvoeren", { status: 500 });
    }
};