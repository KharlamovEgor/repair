'use strict';

const faqItems = document.querySelectorAll('.faq__grid-item');

faqItems.forEach((faqItem) => {
  faqItem.children[0].addEventListener('click', () => {
    faqItem.classList.toggle('open');
  });
});
