/*
	CameoCraft Talent - list renderer
	---------------------------------
	Reads the arrays from data.js and builds the talent lists, calendar
	cards, and "events we worked with" logos. The HTML only contains one
	empty <template> per list (the markup "shape") plus an empty
	container to render into — all real content comes from data.js.
*/

(function () {

	// Small helper: fill in text safely (avoids HTML injection issues).
	function setText(el, text) {
		if (el) el.textContent = text || '';
	}

	// Case-insensitive alphabetical compare, used to sort lists at render
	// time — this does NOT change the order in data.js, only the order
	// items appear on the page.
	function byName(key) {
		return function (a, b) {
			return (a[key] || '').localeCompare(b[key] || '', undefined, { sensitivity: 'base', ignorePunctuation: true });
		};
	}

	// Scrolls smoothly, handled by the browser's compositor thread rather
	// than our own JS — this matters because "Load more" adds a dozen
	// new images at once, and a hand-rolled requestAnimationFrame scroll
	// would stall while the main thread is busy decoding/painting them
	// (producing exactly the "freeze then jump" look). Native smooth
	// scrolling keeps animating through that regardless.
	function smoothScrollToElement(el, offset) {
		if (!el) return;
		var targetY = el.getBoundingClientRect().top + window.pageYOffset - (offset || 20);
		window.scrollTo({ top: Math.max(targetY, 0), left: 0, behavior: 'smooth' });
	}

	// Generic "clone template, fill it in, append to container" renderer.
	// Used by every dynamic list on the site so there's one place that
	// handles the clone/append mechanics and one place that warns loudly
	// (instead of silently doing nothing) when something in the HTML or
	// data.js doesn't line up.
	//
	//   items        - array of data objects to render
	//   templateId    - id of the <template> to clone per item
	//   getContainer  - function(item) -> the container element to append into
	//   fill          - function(node, item) -> fills in the cloned template
	//   label         - short name used in console warnings, e.g. "talent"
	function renderList(items, templateId, getContainer, fill, label) {
		var template = document.getElementById(templateId);
		if (!template) {
			console.warn('[render.js] Missing <template id="' + templateId + '"> — skipping ' + label + ' list.');
			return;
		}

		items.forEach(function (item, index) {
			var container = getContainer(item);
			if (!container) {
				console.warn('[render.js] No matching container for ' + label + ' #' + index +
					' (' + JSON.stringify(item) + ') — check its data against the HTML container ids.');
				return;
			}

			var node = template.content.cloneNode(true);
			fill(node, item);
			container.appendChild(node);
		});
	}

	// ---------------------------------------------------------------
	// Talents lists (talents.html)
	// Only the active category is ever in the DOM, and only the number
	// of items currently "shown" — nothing gets rendered (and no image
	// gets requested) until it's actually needed. Pagination is a plain
	// item count (not grid rows), which keeps this fast: no forced
	// layout measurement on every click, so the smooth-scroll animation
	// isn't fighting a blocked main thread.
	// ---------------------------------------------------------------
	var ITEMS_PER_PAGE = 12;
	var TALENT_CATEGORIES = ['movies-tv', 'voice-actors', 'wrestlers'];

	function fillTalentNode(node, item) {
		var li = node.querySelector('li');
		var img = node.querySelector('img');
		var span = node.querySelector('span');
		var p = node.querySelector('p');

		li.dataset.category = item.category;
		img.src = item.img;
		img.alt = item.name;
		img.loading = 'lazy';
		img.decoding = 'async';
		setText(span, item.name);

		if (item.credits) {
			setText(p, item.credits);
		} else if (p) {
			p.remove();
		}
	}

	// Clears the list and renders the first `count` items — a plain
	// slice, no layout reads, so this stays cheap even for 100+ items.
	function renderTalentsPage(ul, template, items, count) {
		ul.innerHTML = '';
		items.slice(0, count).forEach(function (item) {
			var node = template.content.cloneNode(true);
			fillTalentNode(node, item);
			node.querySelector('li').classList.add('talent-fade-in');
			ul.appendChild(node);
		});
	}

	function renderTalents() {
		if (typeof TALENTS_DATA === 'undefined') return;

		var listEl = document.getElementById('talents-list');
		var template = document.getElementById('talent-item-template');
		var filterButtons = document.querySelectorAll('.talent-filter-btn');
		var loadMoreBtn = document.getElementById('talents-load-more');

		if (!listEl || !template || !filterButtons.length || !loadMoreBtn) {
			console.warn('[render.js] Talents filter UI is missing required elements — skipping talents list.');
			return;
		}

		// Group + alphabetize once.
		var byCategory = {};
		TALENT_CATEGORIES.forEach(function (cat) { byCategory[cat] = []; });

		TALENTS_DATA.forEach(function (item, index) {
			if (!byCategory[item.category]) {
				console.warn('[render.js] Talent #' + index + ' (' + item.name + ') has unknown category "' +
					item.category + '" — it will not be shown. Expected one of: ' + TALENT_CATEGORIES.join(', '));
				return;
			}
			byCategory[item.category].push(item);
		});
		TALENT_CATEGORIES.forEach(function (cat) { byCategory[cat].sort(byName('name')); });

		var activeCategory = 'movies-tv'; // only this category renders on first load
		var itemsShown = {}; // remembers how many items were showing per category

		function refreshLoadMoreButton() {
			var items = byCategory[activeCategory];
			var shown = Math.min(itemsShown[activeCategory] || ITEMS_PER_PAGE, items.length);

			if (items.length <= ITEMS_PER_PAGE) {
				loadMoreBtn.style.display = 'none';
				return;
			}

			if (shown < items.length) {
				loadMoreBtn.textContent = 'Load more';
				loadMoreBtn.dataset.mode = 'more';
			} else {
				loadMoreBtn.textContent = 'Load less';
				loadMoreBtn.dataset.mode = 'less';
			}
			loadMoreBtn.style.display = 'inline-block';
		}

		function showCategory(category) {
			activeCategory = category;
			var items = byCategory[category];
			var count = Math.min(itemsShown[category] || ITEMS_PER_PAGE, items.length);
			renderTalentsPage(listEl, template, items, count);
			itemsShown[category] = count;
			refreshLoadMoreButton();
		}

		filterButtons.forEach(function (btn) {
			btn.addEventListener('click', function () {
				filterButtons.forEach(function (b) { b.classList.toggle('active', b === btn); });
				showCategory(btn.dataset.category);
			});
		});

		loadMoreBtn.addEventListener('click', function () {
			var items = byCategory[activeCategory];

			if (loadMoreBtn.dataset.mode === 'less') {
				itemsShown[activeCategory] = ITEMS_PER_PAGE;
				renderTalentsPage(listEl, template, items, ITEMS_PER_PAGE);
				refreshLoadMoreButton();
				smoothScrollToElement(document.querySelector('.talent-filters'), 100);
				return;
			}

			var previousCount = itemsShown[activeCategory] || ITEMS_PER_PAGE;
			var nextCount = Math.min(previousCount + ITEMS_PER_PAGE, items.length);
			renderTalentsPage(listEl, template, items, nextCount);
			itemsShown[activeCategory] = nextCount;
			refreshLoadMoreButton();

			// Scroll to the first newly-revealed card (not down to the
			// button, which now sits below all the new content) so the
			// view stays focused on what just appeared.
			var firstNewItem = listEl.children[previousCount];
			smoothScrollToElement(firstNewItem || loadMoreBtn, 100);
		});

		showCategory(activeCategory);
	}

	// ---------------------------------------------------------------
	// Calendar (index.html)
	// NOTE: intentionally NOT sorted alphabetically — event dates aren't
	// plain sortable strings ("15 - 17th Jan 2027"), so this list is
	// rendered in the exact order you place events in CALENDAR_EVENTS
	// inside data.js. Put your events in whatever order you want them
	// to appear (e.g. soonest first).
	// ---------------------------------------------------------------
	function renderCalendar() {
		if (typeof CALENDAR_EVENTS === 'undefined') return;

		var cardTemplate = document.getElementById('event-card-template');
		var celebTemplate = document.getElementById('event-card-celebrity-template');
		var container = document.getElementById('calendar-list');
		if (!cardTemplate || !celebTemplate || !container) return;

		CALENDAR_EVENTS.forEach(function (event) {
			var node = cardTemplate.content.cloneNode(true);
			var article = node.querySelector('article');

			if (event.disabled) article.classList.add('disabled');

			var logoImg = node.querySelector('.event-card__logo img');
			logoImg.src = event.logo;
			logoImg.alt = event.logoAlt || event.name;

			setText(node.querySelector('.event-card__info h3'), event.name);
			setText(node.querySelector('.event-card__date-text'), event.date);
			setText(node.querySelector('.event-card__location span'), event.location);

			var lineupList = node.querySelector('.event-card__celebrities');
			(event.lineup || []).forEach(function (celeb) {
				var celebNode = celebTemplate.content.cloneNode(true);
				var celebImg = celebNode.querySelector('img');
				celebImg.src = celeb.img;
				celebImg.alt = celeb.alt || celeb.name;
				setText(celebNode.querySelector('.event-card__celebrity-name'), celeb.name);
				setText(celebNode.querySelector('.event-card__celebrity-role'), celeb.role);
				lineupList.appendChild(celebNode);
			});

			container.appendChild(article);
		});
	}

	// ---------------------------------------------------------------
	// Cons / "Events we worked with" logos (index.html)
	// ---------------------------------------------------------------
	function renderConsLogos() {
		if (typeof CONS_LOGOS === 'undefined') return;

		var template = document.getElementById('cons-logo-template');
		var container = document.getElementById('cons-logos-list');
		if (!template || !container) return;

		// Sort a copy alphabetically by title/alt before rendering.
		var sortedCons = CONS_LOGOS.slice().sort(function (a, b) {
			return (a.title || a.alt || '').localeCompare(b.title || b.alt || '', undefined, { sensitivity: 'base', ignorePunctuation: true });
		});

		sortedCons.forEach(function (item) {
			var node = template.content.cloneNode(true);
			var li = node.querySelector('li');
			var img = node.querySelector('img');
			img.src = item.img;
			img.alt = item.alt || item.title || '';
			img.title = item.title || item.alt || '';
			container.appendChild(li);
		});
	}

	document.addEventListener('DOMContentLoaded', function () {
		renderTalents();
		renderCalendar();
		renderConsLogos();
	});

})();
