'use strict';

import ItcSlider from './slider.js';

const faqItems = document.querySelectorAll('.faq__grid-item');

faqItems.forEach((faqItem) => {
  faqItem.children[0].addEventListener('click', () => {
    faqItem.classList.toggle('open');
  });
});

ItcSlider.createInstances();
