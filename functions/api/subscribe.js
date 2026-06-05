export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // Parse the incoming JSON body
        const { email } = await request.json();

        if (!email) {
            return new Response(JSON.stringify({ error: "Email is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Retrieve secret variables securely bound in Cloudflare dashboard
        const API_KEY = env.BEEHIIV_API_KEY;
        const PUBLICATION_ID = env.BEEHIIV_PUBLICATION_ID;

        if (!API_KEY || !PUBLICATION_ID) {
            return new Response(JSON.stringify({ 
                error: "Server configuration missing: Please set BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID in your Cloudflare dashboard." 
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Call the Beehiiv v2 API
        const beehiivResponse = await fetch(`https://api.beehiiv.com/v2/publications/${PUBLICATION_ID}/subscriptions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                email: email,
                send_welcome_email: true,
                reactivate_existing: true,
                utm_source: "binderbrief_website",
                utm_medium: "referral"
            })
        });

        const data = await beehiivResponse.json();

        if (beehiivResponse.ok) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } else {
            // Forward the specific error messages from Beehiiv if available
            const errorMsg = (data.errors && data.errors.join(', ')) || data.message || "Beehiiv subscription failed";
            return new Response(JSON.stringify({ error: errorMsg }), {
                status: beehiivResponse.status,
                headers: { "Content-Type": "application/json" }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: "Internal Server Error: " + err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
