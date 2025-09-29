/*
Disclaimer: The project idea, design, and concept belong to me (Jackelin Britton).
ChatGPT only assisted in helping me put the code together, and debug.
Last update: 9/28/2025 - Fixed tab navigation and card display
*/

// --- MANDATORY FIREBASE SETUP (Included for Canvas environment compliance) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
// --- END MANDATORY FIREBASE SETUP ---

document.addEventListener("DOMContentLoaded", () => {
    // =========================================================
    // ===== TAB NAVIGATION LOGIC (SIMPLIFIED & FIXED) ========
    // =========================================================

    const tabLinks = document.querySelectorAll(".tab-link");
    const tabPanels = document.querySelectorAll(".tab-panel");

// Simple tab switching function
function switchTab(tabName) {
    // Hide all panels and remove active from all links
    tabPanels.forEach(panel => {
        panel.classList.remove("active");
    });
    tabLinks.forEach(link => {
        link.classList.remove("active");
    });
    
    // Show the selected panel
    const targetPanel = document.getElementById(tabName);
    if (targetPanel) {
        targetPanel.classList.add("active");
    }
    
    // Highlight the active tab link
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(link => {
        link.classList.add("active");
    });

    // 👇 ADD THIS CHECK 👇
    if (tabName === "card-creator") {
        // This explicitly makes the #card-preview element visible
        // when the Forge Card tab is clicked.
        showPreview(); 
    }
}

    // Add click event to all tab links
    tabLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const tabName = link.getAttribute("data-tab");
            if (tabName) {
                switchTab(tabName);
            }
        });
    });

    // =========================================================
    // ===== MYSTIC CARD FORGE APP LOGIC =======================
    // =========================================================

    // Paths for mana color icons
    const manaColorIcons = {
        colorless: "colorless.png",
        white: "white.png",
        blue: "blue.png",
        black: "black.png",
        red: "red.png",
        green: "green.png"
    };

    // Grab important DOM elements
    const cardBgSelect = document.getElementById("card-bgcolor");
    const cardPreview = document.getElementById("card-preview");
    const cardForm = document.getElementById("card-form");
    const cardsContainer = document.getElementById("cards-container");
    const commentForm = document.getElementById("comment-form");
    const commentsContainer = document.getElementById("comments-container");

    // Load saved data from localStorage
    let savedCards = JSON.parse(localStorage.getItem("cards")) || [];
    let comments = JSON.parse(localStorage.getItem("comments")) || [];

    // ===== Utility: Build mana symbols HTML row =====
    function getManaSymbols(manaObj) {
        let html = "";
        Object.keys(manaColorIcons).forEach(color => {
            let count;
            if (manaObj) {
                count = manaObj[color] || 0;
            } else {
                const el = document.getElementById("mana-" + color);
                count = el ? parseInt(el.value, 10) : 0;
            }
            
            for (let i = 0; i < count; i++) {
                html += `<img src="${manaColorIcons[color]}" class="mana-icon" alt="${color}"/>`;
            }
        });
        return html;
    }

    // Function to collect current user mana selections
    function getSelectedManaCost() {
        return {
            white: parseInt(document.getElementById("mana-white").value, 10),
            blue: parseInt(document.getElementById("mana-blue").value, 10),
            black: parseInt(document.getElementById("mana-black").value, 10),
            red: parseInt(document.getElementById("mana-red").value, 10),
            green: parseInt(document.getElementById("mana-green").value, 10),
            colorless: parseInt(document.getElementById("mana-colorless").value, 10)
        };
    }

    // ===== Show Live Preview of Card =====
    function showPreview() {
        cardPreview.style.display = "flex";
        document.getElementById("preview-manarow").innerHTML = getManaSymbols();
    }

    // ===== Reset Form and Preview =====
    function resetFormAndPreview() {
        cardForm.reset();
        cardPreview.style.display = "none";
        cardPreview.style.background = "#fafafa";
        document.getElementById("preview-manarow").innerHTML = "";
        document.getElementById("preview-art-container").innerHTML = 
            `<span class="text-gray-400 text-center text-sm">Upload art or use AI to generate it.</span>`;
        document.getElementById("preview-title").textContent = "Card Name";
        document.getElementById("preview-rules").textContent = "Rules Text";
        document.getElementById("preview-signature").textContent = "";
        document.getElementById("preview-power").textContent = "";
        document.getElementById("preview-toughness").textContent = "";
        cardBgSelect.value = "#fafafa";
        
        // Reset mana selectors
        ["mana-white","mana-blue","mana-black","mana-red","mana-green","mana-colorless"].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.selectedIndex = 0;
            }
        });
    }

    // ===== Save Card Function =====
    function saveCard(imageSrc) {
        const card = {
            id: Date.now(),
            title: document.getElementById("card-title").value || "Untitled Card",
            bgColor: cardBgSelect.value,
            mana: {
                white: parseInt(document.getElementById("mana-white").value, 10),
                blue: parseInt(document.getElementById("mana-blue").value, 10),
                black: parseInt(document.getElementById("mana-black").value, 10),
                red: parseInt(document.getElementById("mana-red").value, 10),
                green: parseInt(document.getElementById("mana-green").value, 10),
                colorless: parseInt(document.getElementById("mana-colorless").value, 10)
            },
            ability: document.getElementById("card-ability").value || "No abilities",
            power: document.getElementById("card-power").value || "0",
            toughness: document.getElementById("card-toughness").value || "0",
            signature: document.getElementById("card-signature").value || "",
            image: imageSrc || "",
            votes: 0
        };
        
        savedCards.push(card);
        localStorage.setItem("cards", JSON.stringify(savedCards));
        renderCards();
        resetFormAndPreview();
        
        // Show success message
        alert("Card saved to gallery!");
        
        // Switch to gallery tab
        switchTab("gallery");
    }

    // Watch inputs and update preview live
    const inputIds = ["card-title","card-bgcolor","card-image","card-ability","card-power","card-toughness","card-signature",
                      "mana-white","mana-blue","mana-black","mana-red","mana-green","mana-colorless"];
    
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", showPreview);
            el.addEventListener("change", showPreview);
        }
    });

    // Update preview fields individually
    const titleInput = document.getElementById("card-title");
    if (titleInput) {
        titleInput.addEventListener("input", function () {
            document.getElementById("preview-title").textContent = this.value || "Card Name";
        });
    }

    const abilityInput = document.getElementById("card-ability");
    if (abilityInput) {
        abilityInput.addEventListener("input", function () {
            document.getElementById("preview-rules").textContent = this.value || "Rules Text";
        });
    }

    const powerInput = document.getElementById("card-power");
    if (powerInput) {
        powerInput.addEventListener("input", function () {
            document.getElementById("preview-power").textContent = this.value;
        });
    }

    const toughnessInput = document.getElementById("card-toughness");
    if (toughnessInput) {
        toughnessInput.addEventListener("input", function () {
            document.getElementById("preview-toughness").textContent = this.value;
        });
    }

    const signatureInput = document.getElementById("card-signature");
    if (signatureInput) {
        signatureInput.addEventListener("input", function () {
            document.getElementById("preview-signature").textContent = this.value ? "— " + this.value : "";
        });
    }

    // Change card background color
    if (cardBgSelect) {
        cardBgSelect.addEventListener("change", function () {
            cardPreview.style.background = this.value;
        });
    }

    // Upload card image and preview it
    const imageInput = document.getElementById("card-image");
    if (imageInput) {
        imageInput.addEventListener("change", function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    document.getElementById("preview-art-container").innerHTML =
                        `<img src="${evt.target.result}" class="card-art-img" alt="Card Art"/>`;
                };
                reader.readAsDataURL(file);
            } else {
                document.getElementById("preview-art-container").innerHTML = 
                    `<span class="text-gray-400 text-center text-sm">Upload art or use AI to generate it.</span>`;
            }
        });
    }

    // ===== Render Saved Cards (FIXED) =====
    function renderCards() {
        cardsContainer.innerHTML = "";
        if (savedCards.length === 0) {
            cardsContainer.innerHTML = `<p class="text-gray-400 col-span-full text-center">No cards forged yet! Start creating!</p>`;
            return;
        }

        savedCards.forEach(card => {
            let manaSymRow = getManaSymbols(card.mana);
            const div = document.createElement("div");
            div.className = "card";
            // Don't apply background to entire card
            div.setAttribute('data-card-color', card.bgColor || "#fafafa");
            div.innerHTML = `
                <div class="card-header" style="background: ${card.bgColor ? `linear-gradient(to bottom, ${card.bgColor}88, transparent)` : 'rgba(0, 0, 0, 0.1)'};">
                    <span>${card.title}</span>
                    <span class="card-manacost-row">${manaSymRow}</span>
                </div>
                <div class="card-art-container">
                    <img src="${card.image || 'https://placehold.co/300x180/333/fff?text=No+Art'}" 
                         alt="Card" class="card-art-img" 
                         onerror="this.onerror=null; this.src='https://placehold.co/300x180/333/fff?text=Art+Expired';"/>
                </div>
                <div class="card-text" style="background: rgba(255, 255, 255, 0.9);">${card.ability}</div>
                <div class="card-power-toughness">${card.power || '?'} / ${card.toughness || '?'}</div>
                <div class="card-signature" style="background: rgba(255, 255, 255, 0.6);">${card.signature ? "— " + card.signature : ""}</div>
                <div class="card-voting-controls">
                    <span>Votes: ${card.votes || 0}</span>
                    <div style="display: flex; gap: 8px;">
                        <button class="vote-btn" data-id="${card.id}">Vote</button>
                        <button class="delete-btn" data-id="${card.id}">Delete</button>
                    </div>
                </div>
            `;
            cardsContainer.appendChild(div);
        });

        // Add voting functionality
        document.querySelectorAll(".vote-btn").forEach(btn => {
            btn.addEventListener("click", e => {
                const id = e.target.dataset.id;
                const card = savedCards.find(c => c.id == id);
                if (card) {
                    card.votes = (card.votes || 0) + 1;
                    localStorage.setItem("cards", JSON.stringify(savedCards));
                    renderCards();
                }
            });
        });

        // Add delete functionality
        document.querySelectorAll(".delete-btn").forEach(btn => {
            btn.addEventListener("click", e => {
                const idToDelete = e.target.dataset.id;
                savedCards = savedCards.filter(card => card.id != idToDelete);
                localStorage.setItem("cards", JSON.stringify(savedCards));
                renderCards();
            });
        });
    }

    // ===== AI Generate Card Function =====
    const aiButton = document.getElementById("generate-ai-card");
    if (aiButton) {
        aiButton.addEventListener("click", async () => {
            const aiPromptInput = document.getElementById("ai-prompt");
            
            const userPrompt = aiPromptInput ? aiPromptInput.value.trim() : '';
            const isFullGeneration = userPrompt.length > 0;
            
            aiButton.textContent = isFullGeneration ? "Forging Full Card..." : "Forging Details...";
            aiButton.disabled = true;

            try {
                let response;
                let inputData = {};
                let endpoint = '';

            if (isFullGeneration) {
                endpoint = 'https://card-forge-server.onrender.com/api/generate-full-card';
                inputData = { prompt: userPrompt };
            } else {
                endpoint = 'https://card-forge-server.onrender.com/api/generate-card';
                inputData = {
        currentTitle: document.getElementById("card-title").value,
        currentAbility: document.getElementById("card-ability").value,
        manaCost: getSelectedManaCost(),
    };
}


                response = await fetch(endpoint, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(inputData)
                });

                if (!response.ok) {
                    const errorDetails = await response.json().catch(() => ({ details: `Server returned status ${response.status}.` }));
                    throw new Error(errorDetails.details || errorDetails.error || `HTTP Status ${response.status}`);
                }

                const generatedCard = await response.json();
                
                // Populate Card Form with AI Data
                document.getElementById("card-title").value = generatedCard.name || "AI Card";
                document.getElementById("card-ability").value = generatedCard.rules_text || "";
                document.getElementById("card-power").value = generatedCard.power || "";
                document.getElementById("card-toughness").value = generatedCard.toughness || "";
                
                if (isFullGeneration) {
                    document.getElementById("card-signature").value = generatedCard.signature || "AI Forge";
                    document.getElementById("card-bgcolor").value = generatedCard.card_color || "#fafafa";
                    cardPreview.style.background = generatedCard.card_color || "#fafafa";
                    
                    if (generatedCard.mana_cost) {
                        Object.keys(generatedCard.mana_cost).forEach(color => {
                            const selectElement = document.getElementById(`mana-${color}`);
                            if (selectElement && generatedCard.mana_cost[color] !== undefined) {
                                selectElement.value = generatedCard.mana_cost[color].toString();
                            }
                        });
                    }

                    if (generatedCard.image_url) {
                        document.getElementById("preview-art-container").innerHTML =
                            `<img src="${generatedCard.image_url}" class="card-art-img" alt="AI Generated Card Art"/>`;
                    }
                }

                showPreview();
                
} catch (error) {
    console.error("AI Card Generation Failed:", error);

    if (error.message.includes('fetch')) {
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

    // ===== Download Card as Image =====
    const downloadButton = document.getElementById("download-card");
    if (downloadButton) {
        downloadButton.addEventListener("click", () => {
            html2canvas(cardPreview, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: null
            }).then(canvas => {
                const link = document.createElement("a");
                link.download = `${document.getElementById("card-title").value || 'mystic_card'}.png`;
                link.href = canvas.toDataURL();
                link.click();
            }).catch(error => {
                console.error("Download failed:", error);
                alert("Download failed. Make sure html2canvas library is loaded.");
            });
        });
    }

    // ===== Save Card Event Listener =====
    if (cardForm) {
        cardForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const imageInput = document.getElementById("card-image");
            let imageSrc = "";
            
            const previewImg = document.querySelector("#preview-art-container img");
            if (previewImg && previewImg.src) {
                imageSrc = previewImg.src;
                saveCard(imageSrc);
            } else if (imageInput && imageInput.files && imageInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    imageSrc = evt.target.result;
                    saveCard(imageSrc);
                };
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                saveCard("");
            }
        });
    }

    // ===== Render Comments =====
    function renderComments() {
        if (!commentsContainer) return;
        
        commentsContainer.innerHTML = "";
        if (comments.length === 0) {
            commentsContainer.innerHTML = `<p class="text-gray-400">Be the first to leave a comment!</p>`;
            return;
        }
        comments.forEach(c => {
            const div = document.createElement("div");
            div.className = "comment bg-gray-600 p-3 rounded-lg shadow";
            div.innerHTML = `<p class="text-sm"><strong>${c.user || "Anonymous"}</strong>: ${c.text}</p>`;
            commentsContainer.appendChild(div);
        });
    }

    // ===== Post Comments =====
    if (commentForm) {
        commentForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const text = document.getElementById("comment-text").value.trim();
            if (text) {
                comments.push({ user: "", text });
                localStorage.setItem("comments", JSON.stringify(comments));
                renderComments();
                commentForm.reset();
            }
        });
    }

    // ===== INITIAL LOAD =====
    renderCards();
    renderComments();
});
