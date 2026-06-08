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

        const API_KEY = env.BUTTONDOWN_API_KEY;

        if (!API_KEY) {
            return new Response(JSON.stringify({ 
                error: "Server configuration missing: Please set BUTTONDOWN_API_KEY in your Cloudflare dashboard." 
            }), {
                status: 500,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        // Call the Buttondown API
        const buttondownResponse = await fetch(`https://api.buttondown.email/v1/subscribers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Token ${API_KEY}`
            },
            body: JSON.stringify({
                email: email,
                metadata: {
                    source: "binderbrief_website"
                },
                tags: ["website"]
            })
        });

        const data = await buttondownResponse.json();

        if (buttondownResponse.ok) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        } else {
            let errorMsg = "Buttondown subscription failed";
            if (Array.isArray(data)) {
                errorMsg = data.join(', ');
            } else if (typeof data === 'object' && data !== null) {
                errorMsg = data.detail || Object.entries(data).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`).join('; ');
            } else if (typeof data === 'string') {
                errorMsg = data;
            }
            return new Response(JSON.stringify({ error: errorMsg }), {
                status: buttondownResponse.status,
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
