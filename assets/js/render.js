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

	// ---------------------------------------------------------------
	// Talents lists (talents.html)
	// ---------------------------------------------------------------
	function renderTalents() {
		if (typeof TALENTS_DATA === 'undefined') return;

		var template = document.getElementById('talent-item-template');
		if (!template) return;

		// Map each category to its target <ul>.
		var containers = {
			'movies-tv': document.getElementById('talents-movies-tv'),
			'voice-actors': document.getElementById('talents-voice-actors'),
			'wrestlers': document.getElementById('talents-wrestlers')
		};

		// Sort a copy alphabetically by name before rendering — each
		// category ends up alphabetized since items are appended to their
		// own container in this sorted order.
		var sortedTalents = TALENTS_DATA.slice().sort(byName('name'));

		sortedTalents.forEach(function (item) {
			var container = containers[item.category];
			if (!container) return;

			var node = template.content.cloneNode(true);
			var li = node.querySelector('li');
			var img = node.querySelector('img');
			var span = node.querySelector('span');
			var p = node.querySelector('p');

			img.src = item.img;
			img.alt = item.name;
			setText(span, item.name);

			if (item.credits) {
				setText(p, item.credits);
			} else if (p) {
				p.remove();
			}

			container.appendChild(li);
		});
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
