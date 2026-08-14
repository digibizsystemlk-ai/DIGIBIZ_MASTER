// sms-api-client.js
window.SMS_API_CONFIG = {
    baseUrl: 'https://us-central1-digibiz-sms.cloudfunctions.net',
    apiKey: 'YOUR_API_KEY_HERE' // ← ඔබගේ API Key එක මෙතනට
};

window.sendSMSViaAPI = async function(phoneNumber, message) {
    try {
        let finalPhone = String(phoneNumber || '').trim();
        if (finalPhone && !finalPhone.startsWith('+')) {
            finalPhone = '+' + finalPhone;
        }

        const response = await fetch(`${window.SMS_API_CONFIG.baseUrl}/sendSMSRest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': window.SMS_API_CONFIG.apiKey
            },
            body: JSON.stringify({ phoneNumber: finalPhone, message })
        });
        const result = await response.json();
        if (result.success) {
            console.log('✅ SMS sent:', result.messageId);
            return { success: true, messageId: result.messageId, creditsRemaining: result.creditsRemaining };
        } else {
            console.error('❌ SMS failed:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('🔥 API Error:', error);
        return { success: false, error: error.message };
    }
}
