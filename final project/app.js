/*
Disclaimer: The project idea, design, and concept belong to me (Jackelin Britton).
ChatGPT only assisted in helping me put the code together, and debug.
Last update: 9/28/2025 - Fixed tab navigation, card display, and backend fetch reliability
*/

// --- MANDATORY FIREBASE SETUP (Canvas environment compliance) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// --- END MANDATORY FIREBASE SETUP ---

document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ====== 🔑 DEFINE BACKEND BASE URL (Render deployment) ====
    // =========================================================
    // Centralize the server address so you only change it once if needed
    const API_BASE_URL = "https://card-forge-server.onrender.com";

    // =========================================================
    // ===== TAB NAVIGATION LOGIC ==============================
    // =========================================================
    const tabLinks = document.querySelectorAll(".tab-link");
    const tabPanels = document.querySelectorAll(".tab-panel");

    function switchTab(tabName) {
        tabPanels.forEach(panel => panel.classList.remove("active"));
        tabLinks.forEach(link => link.classList.remove("active"));

        const targetPanel = document.getElementById(tabName);
        if (targetPanel) targetPanel.classList.add("active");

        document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(link => {
            link.classList.add("active");
        });

        if (tabName === "card-creator") {
            showPreview();
        }
    }

    tabLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const tabName = link.getAttribute("data-tab");
            if (tabName) switchTab(tabName);
        });
    });

    // =========================================================
    // ===== AI Generate Card Function =========================
    // =========================================================
    const aiButton = document.getElementById("generate-ai-card");
    if (aiButton) {
        aiButton.addEventListener("click", async () => {
            const aiPromptInput = document.getElementById("ai-prompt");
            const userPrompt = aiPromptInput ? aiPromptInput.value.trim() : "";
            const isFullGeneration = userPrompt.length > 0;

            aiButton.textContent = isFullGeneration ? "Forging Full Card..." : "Forging Details...";
            aiButton.disabled = true;

            try {
                let endpoint = "";
                let inputData = {};

                if (isFullGeneration) {
                    endpoint = `${API_BASE_URL}/api/generate-full-card`;
                    inputData = { prompt: userPrompt };
                } else {
                    endpoint = `${API_BASE_URL}/api/generate-card`;
                    inputData = {
                        currentTitle: document.getElementById("card-title").value,
                        currentAbility: document.getElementById("card-ability").value,
                        manaCost: getSelectedManaCost(),
                    };
                }

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(inputData),
                });

                if (!response.ok) {
                    const errorDetails = await response.json().catch(() => ({
                        details: `Server returned status ${response.status}.`,
                    }));
                    throw new Error(errorDetails.details || errorDetails.error || `HTTP Status ${response.status}`);
                }

                const generatedCard = await response.json();

                // ==== Populate Card with AI data ====
                document.getElementById("card-title").value = generatedCard.name || "AI Card";
                document.getElementById("card-ability").value = generatedCard.rules_text || "";
                document.getElementById("card-power").value = generatedCard.power || "";
                document.getElementById("card-toughness").value = generatedCard.toughness || "";

                if (isFullGeneration) {
                    document.getElementById("card-signature").value = generatedCard.signature || "AI Forge";
                    document.getElementById("card-bgcolor").value = generatedCard.card_color || "#fafafa";
                    cardPreview.style.background = generatedCard.card_color || "#fafafa";

                    if (generatedCard.mana_cost) {
                        Object.keys(generatedCard.mana_cost).forEach((color) => {
                            const selectElement = document.getElementById(`mana-${color}`);
                            if (selectElement && generatedCard.mana_cost[color] !== undefined) {
                                selectElement.value = generatedCard.mana_cost[color].toString();
                            }
                        });
                    }

                    if (generatedCard.image_url) {
                        document.getElementById("preview-art-container").innerHTML = `
                            <img src="${generatedCard.image_url}" class="card-art-img" alt="AI Generated Card Art"/>
                        `;
                    }
                }

                showPreview();

            } catch (error) {
                console.error("AI Card Generation Failed:", error);
                if (error.message.includes("fetch")) {
                    alert("AI generation failed — backend server may be down or unreachable.");
                } else {
                    alert(`Error generating card. Details: ${error.message}`);
                }
            } finally {
                aiButton.textContent = "AI Generate Card";
                aiButton.disabled = false;
            }
        });
    }

    // (⚡ everything else in your original app.js remains unchanged —
    // tab switching, preview, saveCard, renderCards, comments, etc.)
});
