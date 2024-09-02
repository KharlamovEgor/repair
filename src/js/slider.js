export default class ItcSlider {
  static _EL_WRAPPER = 'wrapper';
  static _EL_ITEMS = 'items';
  static _EL_ITEM = 'item';
  static _EL_ITEM_ACTIVE = 'item_active';
  static _EL_INDICATOR = 'indicator';
  static _EL_INDICATOR_ACTIVE = 'indicator_active';
  static _BTN_PREV = 'btn_prev';
  static _BTN_NEXT = 'btn_next';
  static _BTN_HIDE = 'btn_hide';
  static _TRANSITION_NONE = 'transition-none';

  static _instances = [];

  _config;
  _state;

  /**
   * @param {HTMLElement} el
   * @param {Object} config
   * @param {String} prefix
   */
  constructor(el, config = {}, prefix = 'itc-slider__') {
    this._state = {
      prefix: prefix, // префикс для классов
      el: el, // элемент который нужно активировать как ItcSlider
      elWrapper: el.querySelector(`.${prefix}${this.constructor._EL_WRAPPER}`), // элемент с _CLASS_WRAPPER
      elItems: el.querySelector(`.${prefix}${this.constructor._EL_ITEMS}`), // элемент, в котором находятся слайды
      elListItem: el.querySelectorAll(`.${prefix}${this.constructor._EL_ITEM}`), // список элементов, являющиеся слайдами
      btnPrev: el.querySelector(`.${prefix}${this.constructor._BTN_PREV}`), // кнопка, для перехода к предыдущему слайду
      btnNext: el.querySelector(`.${prefix}${this.constructor._BTN_NEXT}`), // кнопка, для перехода к следующему слайду
      btnClassHide: prefix + this.constructor._BTN_HIDE, // класс для скрытия кнопки
      exOrderMin: 0,
      exOrderMax: 0,
      exItemMin: null,
      exItemMax: null,
      exTranslateMin: 0,
      exTranslateMax: 0,
      direction: 'next', // направление смены слайдов
      intervalId: null, // id таймера
      isSwiping: false,
      swipeX: 0,
    };

    this._config = {
      loop: true,
      autoplay: false,
      interval: 5000,
      refresh: true,
      swipe: true,
      ...config,
    };

    this._init();
    this._attachEvents();
  }

  /**
   * Статический метод, который возвращает экземпляр ItcSlider, связанный с DOM-элементом
   * @param {HTMLElement} elSlider
   * @returns {?ItcSlider}
   */
  static getInstance(elSlider) {
    const found = this._instances.find((el) => el.target === elSlider);
    if (found) {
      return found.instance;
    }
    return null;
  }

  /**
   * @param {String|HTMLElement} target
   * @param {Object} config
   * @param {String} prefix
   */
  static getOrCreateInstance(target, config = {}, prefix = 'itc-slider__') {
    try {
      const elSlider =
        typeof target === 'string' ? document.querySelector(target) : target;
      const result = this.getInstance(elSlider);
      if (result) {
        return result;
      }
      const slider = new this(elSlider, config, prefix);
      this._instances.push({ target: elSlider, instance: slider });
      return this;
    } catch (e) {
      console.error(e);
    }
  }

  // статический метод для активирования элементов как ItcSlider на основе data-атрибутов
  static createInstances() {
    document.querySelectorAll('[data-slider="itc-slider"]').forEach((el) => {
      const dataset = el.dataset;
      const params = {};
      Object.keys(dataset).forEach((key) => {
        if (key === 'slider') {
          return;
        }
        let value = dataset[key];
        value = value === 'true' ? true : value;
        value = value === 'false' ? false : value;
        value = Number.isNaN(Number(value)) ? Number(value) : value;
        params[key] = value;
      });
      this.getOrCreateInstance(el, params);
    });
  }

  next() {
    this._state.direction = 'next';
    this._move();
  }

  prev() {
    this._state.direction = 'prev';
    this._move();
  }

  moveTo(index) {
    this._moveTo(index);
  }

  reset() {
    this._reset();
  }

  dispose() {
    this._detachEvents();
    const transitionNoneClass =
      this._state.prefix + this.constructor._TRANSITION_NONE;
    const activeClass = this._state.prefix + this.constructor._EL_ITEM_ACTIVE;
    this._autoplay('stop');
    this._state.elItems.classList.add(transitionNoneClass);
    this._state.elItems.style.transform = '';
    this._state.elListItem.forEach((el) => {
      el.style.transform = '';
      el.classList.remove(activeClass);
    });

    this._state.elItems.offsetHeight;
    this._state.elItems.classList.remove(transitionNoneClass);
    const index = this.constructor._instances.findIndex(
      (el) => el.target === this._state.el,
    );
    this.constructor._instances.splice(index, 1);
  }

  _onClick(e) {
    const classBtnPrev = this._state.prefix + this.constructor._BTN_PREV;
    const classBtnNext = this._state.prefix + this.constructor._BTN_NEXT;
    this._autoplay('stop');
    if (
      e.target.closest(`.${classBtnPrev}`) ||
      e.target.closest(`.${classBtnNext}`)
    ) {
      this._state.direction = e.target.closest(`.${classBtnPrev}`)
        ? 'prev'
        : 'next';
      this._move();
    } else if (e.target.dataset.slideTo) {
      const index = parseInt(e.target.dataset.slideTo, 10);
      this._moveTo(index);
    }
    this._config.loop ? this._autoplay() : null;
  }

  _onMouseEnter() {
    this._autoplay('stop');
  }

  _onMouseLeave() {
    this._autoplay();
  }

  _onResize() {
    window.requestAnimationFrame(this._reset.bind(this));
  }

  _onSwipeStart(e) {
    this._autoplay('stop');
    const event = e.type.search('touch') === 0 ? e.touches[0] : e;
    this._state.swipeX = event.clientX;
    this._state.isSwiping = true;
  }

  _onSwipeEnd(e) {
    if (!this._state.isSwiping) {
      return;
    }
    const event = e.type.search('touch') === 0 ? e.changedTouches[0] : e;
    const diffPos = this._state.swipeX - event.clientX;
    if (diffPos > 50) {
      this._state.direction = 'next';
      this._move();
    } else if (diffPos < -50) {
      this._state.direction = 'prev';
      this._move();
    }
    this._state.isSwiping = false;
    if (this._config.loop) {
      this._autoplay();
    }
  }

  _onTransitionStart() {
    if (this._state.isBalancing) {
      return;
    }
    this._state.isBalancing = true;
    window.requestAnimationFrame(this._balanceItems.bind(this));
  }

  _onTransitionEnd() {
    this._state.isBalancing = false;
  }

  _onDragStart(e) {
    e.preventDefault();
  }

  _onVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      this._autoplay('stop');
    } else if (document.visibilityState === 'visible' && this._config.loop) {
      this._autoplay();
    }
  }

  _attachEvents() {
    this._state.events = {
      click: [this._state.el, this._onClick.bind(this), true],
      mouseenter: [this._state.el, this._onMouseEnter.bind(this), true],
      mouseleave: [this._state.el, this._onMouseLeave.bind(this), true],
      resize: [window, this._onResize.bind(this), this._config.refresh],
      'itc-slider__transition-start': [
        this._state.elItems,
        this._onTransitionStart.bind(this),
        this._config.loop,
      ],
      transitionend: [
        this._state.elItems,
        this._onTransitionEnd.bind(this),
        this._config.loop,
      ],
      touchstart: [
        this._state.el,
        this._onSwipeStart.bind(this),
        this._config.swipe,
      ],
      mousedown: [
        this._state.el,
        this._onSwipeStart.bind(this),
        this._config.swipe,
      ],
      touchend: [document, this._onSwipeEnd.bind(this), this._config.swipe],
      mouseup: [document, this._onSwipeEnd.bind(this), this._config.swipe],
      dragstart: [this._state.el, this._onDragStart.bind(this), true],
      visibilitychange: [document, this._onVisibilityChange.bind(this), true],
    };
    Object.keys(this._state.events).forEach((type) => {
      if (this._state.events[type][2]) {
        const el = this._state.events[type][0];
        const fn = this._state.events[type][1];
        el.addEventListener(type, fn);
      }
    });
  }

  _detachEvents() {
    Object.keys(this._state.events).forEach((type) => {
      if (this._state.events[type][2]) {
        const el = this._state.events[type][0];
        const fn = this._state.events[type][1];
        el.removeEventListener(type, fn);
      }
    });
  }

  _autoplay(action) {
    if (!this._config.autoplay) {
      return;
    }
    if (action === 'stop') {
      clearInterval(this._state.intervalId);
      this._state.intervalId = null;
      return;
    }
    if (this._state.intervalId === null) {
      this._state.intervalId = setInterval(() => {
        this._state.direction = 'next';
        this._move();
      }, this._config.interval);
    }
  }

  _balanceItems() {
    if (!this._state.isBalancing) {
      return;
    }
    const wrapperRect = this._state.elWrapper.getBoundingClientRect();
    const targetWidth = wrapperRect.width / this._state.countActiveItems / 2;
    const countItems = this._state.elListItem.length;
    if (this._state.direction === 'next') {
      const exItemRectRight =
        this._state.exItemMin.getBoundingClientRect().right;
      if (exItemRectRight < wrapperRect.left - targetWidth) {
        const elFound = this._state.els.find(
          (item) => item.el === this._state.exItemMin,
        );
        elFound.order = this._state.exOrderMin + countItems;
        const translate =
          this._state.exTranslateMin + countItems * this._state.width;
        elFound.translate = translate;
        this._state.exItemMin.style.transform = `translate3D(${translate}px, 0px, 0.1px)`;
        this._updateExProperties();
      }
    } else {
      const exItemRectLeft = this._state.exItemMax.getBoundingClientRect().left;
      if (exItemRectLeft > wrapperRect.right + targetWidth) {
        const elFound = this._state.els.find(
          (item) => item.el === this._state.exItemMax,
        );
        elFound.order = this._state.exOrderMax - countItems;
        const translate =
          this._state.exTranslateMax - countItems * this._state.width;
        elFound.translate = translate;
        this._state.exItemMax.style.transform = `translate3D(${translate}px, 0px, 0.1px)`;
        this._updateExProperties();
      }
    }
    window.requestAnimationFrame(this._balanceItems.bind(this));
  }

  _updateClasses() {
    const activeClass = this._state.prefix + this.constructor._EL_ITEM_ACTIVE;
    this._state.activeItems.forEach((item, index) => {
      if (item) {
        this._state.elListItem[index].classList.add(activeClass);
      } else {
        this._state.elListItem[index].classList.remove(activeClass);
      }
    });
  }

  _move() {
    const widthItem =
      this._state.direction === 'next' ? -this._state.width : this._state.width;
    const transform = this._state.translate + widthItem;
    if (!this._config.loop) {
      const limit =
        this._state.width *
        (this._state.elListItem.length - this._state.countActiveItems);
      if (transform < -limit || transform > 0) {
        return;
      }
      if (this._state.btnPrev) {
        this._state.btnPrev.classList.remove(this._state.btnClassHide);
        this._state.btnNext.classList.remove(this._state.btnClassHide);
      }
      if (this._state.btnPrev && transform === -limit) {
        this._state.btnNext.classList.add(this._state.btnClassHide);
      } else if (this._state.btnPrev && transform === 0) {
        this._state.btnPrev.classList.add(this._state.btnClassHide);
      }
    }
    if (this._state.direction === 'next') {
      this._state.activeItems = [
        ...this._state.activeItems.slice(-1),
        ...this._state.activeItems.slice(0, -1),
      ];
    } else {
      this._state.activeItems = [
        ...this._state.activeItems.slice(1),
        ...this._state.activeItems.slice(0, 1),
      ];
    }
    this._updateClasses();
    this._state.translate = transform;
    this._state.elItems.style.transform = `translate3D(${transform}px, 0px, 0.1px)`;
    this._state.elItems.dispatchEvent(
      new CustomEvent('itc-slider__transition-start', {
        bubbles: true,
      }),
    );
  }

  _moveTo(index) {
    const delta = this._state.activeItems.reduce(
      (acc, current, currentIndex) => {
        const diff = current ? index - currentIndex : acc;
        return Math.abs(diff) < Math.abs(acc) ? diff : acc;
      },
      this._state.activeItems.length,
    );
    if (delta !== 0) {
      this._state.direction = delta > 0 ? 'next' : 'prev';
      for (let i = 0; i < Math.abs(delta); i++) {
        this._move();
      }
    }
  }

  // приватный метод для выполнения первичной иницианализации
  _init() {
    // состояние элементов
    this._state.els = [];
    // текущее значение translate
    this._state.translate = 0;
    // позиции активных элементов
    this._state.activeItems = [];
    // состояние элементов
    this._state.isBalancing = false;
    // ширина одного слайда
    this._state.width = this._state.elListItem[0].getBoundingClientRect().width;
    // ширина _EL_WRAPPER
    const widthWrapper = this._state.elWrapper.getBoundingClientRect().width;
    // количество активных элементов
    this._state.countActiveItems = Math.round(widthWrapper / this._state.width);
    this._state.elListItem.forEach((el, index) => {
      el.style.transform = '';
      this._state.activeItems.push(
        index < this._state.countActiveItems ? 1 : 0,
      );
      this._state.els.push({ el, index, order: index, translate: 0 });
    });
    if (this._config.loop) {
      const lastIndex = this._state.elListItem.length - 1;
      const translate = -(lastIndex + 1) * this._state.width;
      this._state.elListItem[
        lastIndex
      ].style.transform = `translate3D(${translate}px, 0px, 0.1px)`;
      this._state.els[lastIndex].order = -1;
      this._state.els[lastIndex].translate = translate;
      this._updateExProperties();
    } else if (this._state.btnPrev) {
      this._state.btnPrev.classList.add(this._state.btnClassHide);
    }
    this._updateClasses();
    this._autoplay();
  }

  _reset() {
    const transitionNoneClass =
      this._state.prefix + this.constructor._TRANSITION_NONE;
    const widthItem = this._state.elListItem[0].getBoundingClientRect().width;
    const widthWrapper = this._state.elWrapper.getBoundingClientRect().width;
    const countActiveEls = Math.round(widthWrapper / widthItem);
    if (
      widthItem === this._state.width &&
      countActiveEls === this._state.countActiveItems
    ) {
      return;
    }
    this._autoplay('stop');
    this._state.elItems.classList.add(transitionNoneClass);
    this._state.elItems.style.transform = 'translate3D(0px, 0px, 0.1px)';
    this._init();
    window.requestAnimationFrame(() => {
      this._state.elItems.classList.remove(transitionNoneClass);
    });
  }

  _updateExProperties() {
    const els = this._state.els.map((item) => item.el);
    const orders = this._state.els.map((item) => item.order);
    this._state.exOrderMin = Math.min(...orders);
    this._state.exOrderMax = Math.max(...orders);
    const min = orders.indexOf(this._state.exOrderMin);
    const max = orders.indexOf(this._state.exOrderMax);
    this._state.exItemMin = els[min];
    this._state.exItemMax = els[max];
    this._state.exTranslateMin = this._state.els[min].translate;
    this._state.exTranslateMax = this._state.els[max].translate;
  }
}


