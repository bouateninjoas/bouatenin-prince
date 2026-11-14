const buttons = document.querySelectorAll(".filters button");
const items = document.querySelectorAll(".gallery-item");

buttons.forEach(button => {
  button.addEventListener("click", () => {

    buttons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    const filter = button.dataset.filter;

    items.forEach(item => {
      if (
        filter === "all" ||
        item.dataset.category === filter
      ) {
        item.classList.remove("hide");
      } else {
        item.classList.add("hide");
      }
    });

  });
});
