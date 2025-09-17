/*
Disclaimer: The project idea, design, and concept belong to me (Jackelin Britton).
ChatGPT only assisted in helping me put the code together, and debug.
Last update: 9/16/2025
*/

document.addEventListener("DOMContentLoaded", () => {
  // === Portfolio NAVIGATION: Smooth scroll to sections on nav click ===
  document.querySelectorAll("a[href^='#']").forEach(link => {
    link.addEventListener("click", function(e){
      const targetID = this.getAttribute("href").slice(1);
      const target = document.getElementById(targetID);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({behavior: "smooth"});
      }
    });
  });

  // === Mystic Card Forge App Logic ===
  const manaColorIcons = {
    colorless: "colorless.png",
    white: "white.png",
    blue: "blue.png",
    black: "black.png",
    red: "red.png",
    green: "green.png"
  };

  const cardBgSelect = document.getElementById("card-bgcolor");
  const cardPreview = document.getElementById("card-preview");
  const cardForm = document.getElementById("card-form");
  const cardsContainer = document.getElementById("cards-container");
  const commentForm = document.getElementById("comment-form");
  const commentsContainer = document.getElementById("comments-container");
  let savedCards = JSON.parse(localStorage.getItem("cards")) || [];
  let comments = JSON.parse(localStorage.getItem("comments")) || [];

  function getManaSymbols(manaObj) {
    let html = "";
    Object.keys(manaColorIcons).forEach(color => {
      let count = manaObj ? manaObj[color] : parseInt(document.getElementById("mana-" + color).value, 10);
      for (let i = 0; i < count; i++) {
        html += `<img src="${manaColorIcons[color]}" class="mana-icon" alt="${color}"/>`;
      }
    });
    return html;
  }

  function showPreview() {
    cardPreview.style.display = "block";
    document.getElementById("preview-manarow").innerHTML = getManaSymbols();
  }
  ["card-title","card-bgcolor","card-image","card-ability","card-power","card-toughness","card-signature",
    "mana-white","mana-blue","mana-black","mana-red","mana-green","mana-colorless"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", showPreview);
        el.addEventListener("change", showPreview);
      }
  });

  document.getElementById("card-title").addEventListener("input", function () {
    document.getElementById("preview-title").textContent = this.value || "Card Name";
  });
  document.getElementById("card-ability").addEventListener("input", function () {
    document.getElementById("preview-rules").textContent = this.value || "Rules Text";
  });
  document.getElementById("card-power").addEventListener("input", function () {
    document.getElementById("preview-power").textContent = this.value;
  });
  document.getElementById("card-toughness").addEventListener("input", function () {
    document.getElementById("preview-toughness").textContent = this.value;
  });
  document.getElementById("card-signature").addEventListener("input", function () {
    document.getElementById("preview-signature").textContent = this.value ? "— " + this.value : "";
  });
  cardBgSelect.addEventListener("change", function () {
    cardPreview.style.background = this.value;
  });
  document.getElementById("card-image").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        document.getElementById("preview-art-container").innerHTML =
          `<img src="${evt.target.result}" class="card-art-img" alt="Card Art"/>`;
      };
      reader.readAsDataURL(file);
    } else {
      document.getElementById("preview-art-container").innerHTML = "";
    }
  });

  function renderCards() {
    cardsContainer.innerHTML = "";
    savedCards.forEach(card => {
      let manaSymRow = getManaSymbols(card.mana);
      const div = document.createElement("div");
      div.className = "card";
      div.style.background = card.bgColor || "#fafafa";
      div.innerHTML = `
        <div class="card-header">
          <span>${card.title}</span>
          <span class="card-manacost-row">${manaSymRow}</span>
        </div>
        <img src="${card.image}" alt="Card" class="card-art-img"/>
        <div class="card-text">${card.ability}</div>
        <div class="card-power-toughness">${card.power} / ${card.toughness}</div>
        <div class="card-signature">${card.signature ? "— " + card.signature : ""}</div>
        <p>Votes: ${card.votes || 0}</p>
        <button class="vote-btn" data-id="${card.id}">Vote</button>
        <button class="delete-btn" data-id="${card.id}">Delete</button>
      `;
      cardsContainer.appendChild(div);
    });

    document.querySelectorAll(".vote-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const id = e.target.dataset.id;
        const card = savedCards.find(c => c.id == id);
        card.votes = (card.votes || 0) + 1;
        localStorage.setItem("cards", JSON.stringify(savedCards));
        renderCards();
      });
    });
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const idToDelete = e.target.dataset.id;
        savedCards = savedCards.filter(card => card.id != idToDelete);
        localStorage.setItem("cards", JSON.stringify(savedCards));
        renderCards();
      });
    });
  }

  function renderComments() {
    commentsContainer.innerHTML = "";
    comments.forEach(c => {
      const div = document.createElement("div");
      div.className = "comment";
      div.innerHTML = `<strong>${c.user || "Anonymous"}</strong>: ${c.text}`;
      commentsContainer.appendChild(div);
    });
  }

  cardForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const imageInput = document.getElementById("card-image");
    let imageSrc = "";
    if (imageInput && imageInput.files && imageInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        imageSrc = evt.target.result;
        saveCard(imageSrc);
      };
      reader.readAsDataURL(imageInput.files[0]);
    } else {
      saveCard("");
    }
    function saveCard(imageSrc) {
      const card = {
        id: Date.now(),
        title: document.getElementById("card-title").value,
        bgColor: cardBgSelect.value,
        mana: {
          white: parseInt(document.getElementById("mana-white").value, 10),
          blue: parseInt(document.getElementById("mana-blue").value, 10),
          black: parseInt(document.getElementById("mana-black").value, 10),
          red: parseInt(document.getElementById("mana-red").value, 10),
          green: parseInt(document.getElementById("mana-green").value, 10),
          colorless: parseInt(document.getElementById("mana-colorless").value, 10)
        },
        ability: document.getElementById("card-ability").value,
        power: document.getElementById("card-power").value,
        toughness: document.getElementById("card-toughness").value,
        signature: document.getElementById("card-signature").value,
        image: imageSrc || "",
        votes: 0
      };
      savedCards.push(card);
      localStorage.setItem("cards", JSON.stringify(savedCards));
      renderCards();
      cardForm.reset();
      cardPreview.style.display = "none";
      cardPreview.style.background = "#fafafa";
      document.getElementById("preview-manarow").innerHTML = "";
      document.getElementById("preview-art-container").innerHTML = "";
      document.getElementById("preview-title").textContent = "Card Name";
      document.getElementById("preview-rules").textContent = "Rules Text";
      document.getElementById("preview-signature").textContent = "";
      document.getElementById("preview-power").textContent = "";
      document.getElementById("preview-toughness").textContent = "";
      cardBgSelect.value = "#fafafa";
      ["mana-white","mana-blue","mana-black","mana-red","mana-green","mana-colorless"].forEach(id=>{
        document.getElementById(id).selectedIndex=0;
      });
    }
  });

  document.getElementById("generate-ai-card").addEventListener("click", () => {
    alert("AI generation placeholder — integrate with an API later.");
  });

  document.getElementById("download-card").addEventListener("click", () => {
    html2canvas(cardPreview).then(canvas => {
      const link = document.createElement("a");
      link.download = "card.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  });

  commentForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const text = document.getElementById("comment-text").value;
    comments.push({ user: "", text });
    localStorage.setItem("comments", JSON.stringify(comments));
    renderComments();
    commentForm.reset();
  });

  renderCards();
  renderComments();
});
