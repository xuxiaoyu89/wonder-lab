const factCards = document.querySelectorAll(".fact-card");
const badgeCount = document.querySelector("#badgeCount");
const missionAnswer = document.querySelector("#missionAnswer");
const saveLog = document.querySelector("#saveLog");
const savedNote = document.querySelector("#savedNote");
const moonOriginVideo = document.querySelector("#moonOriginVideo");
const storageKey = "wonderLabTheiaImpactMissionLog";

const readCards = new Set();
const totalCards = factCards.length;

factCards.forEach((card) => {
  const title = card.querySelector(".card-title");
  title.addEventListener("click", () => {
    factCards.forEach((item) => item.classList.remove("is-open"));
    card.classList.add("is-open");
    card.classList.add("is-read");
    readCards.add(card.dataset.card);
    badgeCount.textContent = `${readCards.size}/${totalCards}`;
  });
});

saveLog.addEventListener("click", () => {
  const thought = missionAnswer.value.trim();
  if (!thought) {
    savedNote.textContent = "Try writing one thing you noticed.";
    return;
  }
  localStorage.setItem(storageKey, thought);
  savedNote.textContent = "Saved.";
});

window.addEventListener("load", () => {
  setTimeout(() => {
    moonOriginVideo.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: "playVideo",
        args: [],
      }),
      "https://www.youtube.com"
    );
  }, 1200);
});

const savedThought = localStorage.getItem(storageKey);
if (savedThought) {
  missionAnswer.value = savedThought;
}
