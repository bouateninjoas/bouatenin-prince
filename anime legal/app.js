const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.platform-card');
const resultMessage = document.querySelector('#results-message');

filters.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach((item) => item.classList.toggle('is-active', item === button));

    let visibleCount = 0;
    cards.forEach((card) => {
      const visible = filter === 'all' || card.dataset.type === filter;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    resultMessage.textContent = `${visibleCount} plateforme${visibleCount === 1 ? '' : 's'} affichée${visibleCount === 1 ? '' : 's'}.`;
  });
});
