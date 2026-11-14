
const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const progress = document.getElementById("progress");
const current = document.getElementById("current");
const duration = document.getElementById("duration");
const fileInput = document.getElementById("fileInput");

const title = document.getElementById("title");
const artist = document.getElementById("artist");

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";

    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);

    return min + ":" + String(sec).padStart(2, "0");
}

// Lecture et pause
playBtn.addEventListener("click", () => {
    if (!audio.src) {
        alert("Chargez d'abord une musique !");
        return;
    }

    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
});

// Changer le bouton
audio.addEventListener("play", () => {
    playBtn.textContent = "Ⅱ";
});

audio.addEventListener("pause", () => {
    playBtn.textContent = "▶";
});

// Progression
audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
        progress.value =
            (audio.currentTime / audio.duration) * 100;

        current.textContent = formatTime(audio.currentTime);
    }
});

// Durée totale
audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(audio.duration);
});

// Barre de progression interactive
progress.addEventListener("input", () => {
    if (audio.duration) {
        audio.currentTime =
            (progress.value / 100) * audio.duration;
    }
});

// Charger une musique
fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) return;

    audio.src = URL.createObjectURL(file);

    title.textContent = file.name.replace(/\.[^/.]+$/, "");
    artist.textContent = "Fichier local";

    progress.value = 0;
    current.textContent = "0:00";

    audio.load();

    audio.play().catch(() => {
        playBtn.textContent = "▶";
    });
});

// Fin de la musique
audio.addEventListener("ended", () => {
    playBtn.textContent = "▶";
    progress.value = 0;
    current.textContent = "0:00";
});
