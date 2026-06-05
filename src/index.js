export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Intercept API subscription requests
        if (url.pathname === "/api/subscribe" && request.method === "POST") {
            return await handleSubscribe(request, env);
        }

        // Fallback to serving static assets (HTML, CSS, JS, etc.)
        return env.ASSETS.fetch(request);
    }
};

async function handleSubscribe(request, env) {
    try {
        const { email } = await request.json();

        if (!email) {
            return new Response(JSON.stringify({ error: "Email is required" }), {
                status: 400,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        const API_KEY = env.BEEHIIV_API_KEY;
        const PUBLICATION_ID = env.BEEHIIV_PUBLICATION_ID;

        if (!API_KEY || !PUBLICATION_ID) {
            return new Response(JSON.stringify({ 
                error: "Server configuration missing: Please set BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID in your Cloudflare dashboard." 
            }), {
                status: 500,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
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
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        } else {
            let errorMsg = "Beehiiv subscription failed";
            if (data.errors) {
                if (Array.isArray(data.errors)) {
                    errorMsg = data.errors.map(err => {
                        if (typeof err === 'object') {
                            return Object.entries(err).map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`).join('; ');
                        }
                        return String(err);
                    }).join(', ');
                } else if (typeof data.errors === 'object') {
                    errorMsg = Object.entries(data.errors).map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`).join('; ');
                } else {
                    errorMsg = String(data.errors);
                }
            } else if (data.message) {
                errorMsg = data.message;
            }
            return new Response(JSON.stringify({ error: errorMsg }), {
                status: beehiivResponse.status,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: "Internal Server Error: " + err.message }), {
            status: 500,
            headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        });
    }
}
