{
	"translatorID": "40ba1e56-f2aa-4cf1-9a7c-1b59a5d41b75",
	"label": "OpenReview",
	"creator": "Max",
	"target": "^https?://(www\\.)?openreview\\.net/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-07-21 03:36:35"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2026 Max Han

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


// ICLR (International Conference on Learning Representations) opens their
// anonymous submission cycle in the fall of the *preceding* year, and that
// early date is what OpenReview exposes in its citation_publication_date meta
// tag. Embedded Metadata therefore files, e.g., an accepted ICLR 2026 paper as
// 2025. We instead read the paper's venue from the rendered page — which names
// the actual conference year — and only correct the date for papers that have
// actually been accepted into a venue, so preprints / desk-rejected / withdrawn
// submissions keep their submission date.


function detectWeb(doc, url) {
	// A single paper: /forum?id=…, /pdf?id=…, /note?id=…
	if (/[?&]id=/.test(url) && /\/(forum|pdf|note)\b/i.test(url)) {
		return 'conferencePaper';
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

// Look for the venue the paper was accepted into and return its year (and the
// raw venue label so we can tell accepted from non-accepted submissions).
// Returns { year, label } or null.
function detectVenue(doc) {
	// Preferred: the venue is rendered as a link to its group page, e.g.
	//   /group?id=ICLR.cc/2026/Conference
	// The venue id always carries the real conference year, regardless of how
	// the (obfuscated) surrounding markup changes.
	for (let a of doc.querySelectorAll('a[href*="group?id="]')) {
		let href = a.getAttribute('href') || '';
		let label = a.textContent.trim();
		let match = href.match(/\.cc\/(20\d{2})\b/);
		if (match) {
			return { year: match[1], label };
		}
	}

	// Fallback: scan headings / links / conference meta for a "<VENUE> <year>"
	// label near the top of the page.
	let venueYearRe = /\b(ICLR|NeurIPS|COLM|CoRL|ICML|AAAI|CVPR|ECCV|ICCV|ACL|EMNLP|NAACL|AISTATS|TMLR)\b[\s\S]{0,20}?\b(20\d{2})\b/i;
	let nodes = doc.querySelectorAll('h1, h2, h3, h4, a, meta[name="citation_conference_title"]');
	for (let node of nodes) {
		let text = node.textContent || node.getAttribute('content') || '';
		let match = text.match(venueYearRe);
		if (match) {
			return { year: match[2], label: ZU.trimInternal(text) };
		}
	}

	return null;
}

// True when the venue label indicates the paper was actually published in the
// venue (not merely submitted / under review / rejected / withdrawn).
function isAccepted(label) {
	return !/(submitted to|under review|withdrawn|desk reject|reject|non-archival)/i.test(label || '');
}

function scrape(doc, _url) {
	let venue = detectVenue(doc);
	let accepted = venue && isAccepted(venue.label);

	let translator = Z.loadTranslator('web');
	// Embedded Metadata
	translator.setTranslator('951c027d-74ac-47d4-a107-9c3069ab7b48');
	translator.setDocument(doc);

	translator.setHandler('itemDone', function (obj, item) {
		// Correct the publication year: use the venue's conference year instead
		// of the anonymous-submission date that EM picks up from
		// citation_publication_date.
		if (venue && accepted && venue.year) {
			item.date = venue.year;
			item.itemType = 'conferencePaper';
			if (!item.publisher) {
				item.publisher = 'OpenReview.net';
			}
		}

		item.complete();
	});

	translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://openreview.net/forum?id=0wSlFpMsGb",
		"items": []
	}
]
/** END TEST CASES **/
