/* This small shared script powers the home illustration and task-page clock. */
(() => {
  // The home preview uses today's date instead of a sample date that becomes misleading.
  const previewWeekday = document.querySelector('#preview-weekday');
  const previewDay = document.querySelector('#preview-day');
  if (previewWeekday && previewDay) {
    const today = new Date();
    previewWeekday.textContent = new Intl.DateTimeFormat('en-AU', {weekday: 'long'}).format(today);
    previewDay.textContent = new Intl.DateTimeFormat('en-AU', {day: '2-digit'}).format(today);
  }
  const slides = [
    {src: '../../assets/study-plan.svg', alt: 'A notebook with a weekly study plan', caption: 'Map out your study week.'},
    {src: '../../assets/study-focus.svg', alt: 'A desk with books and a focused study session', caption: 'Make time to focus.'},
    {src: '../../assets/study-progress.svg', alt: 'A checklist showing study progress', caption: 'See the next step clearly.'}
  ];
  const image = document.querySelector('#study-image');
  const next = document.querySelector('#next-image');
  if (image && next) {
    let slide = 0;
    next.addEventListener('click', () => {
      slide = (slide + 1) % slides.length;
      image.src = slides[slide].src;
      image.alt = slides[slide].alt;
      document.querySelector('#image-description').textContent = slides[slide].caption;
      document.querySelector('#image-counter').textContent = `${String(slide + 1).padStart(2, '0')} / 03`;
    });
  }

  const clock = document.querySelector('#current-datetime');
  if (clock) {
    const updateClock = () => { clock.textContent = `Current date and time: ${new Intl.DateTimeFormat('en-AU', {dateStyle: 'medium', timeStyle: 'medium'}).format(new Date())}`; };
    updateClock();
    window.setInterval(updateClock, 1000);
  }
})();
