import { loadBooks, bookProgress } from '../content.js';
import { icon } from '../icons.js';
import { renderCover, escapeHtml } from '../util.js';

export const title = 'बिश्नोई शब्दवाणी';

// "मुख्य श्रेणियां" (Stitch "hero spotlight" variant): one large featured
// card for the Shabadvani followed by a 3-column row of secondary cards.
// Each card points at a book in books.json by `id`; a card whose book is
// missing — or that has no book yet (`id: null`, e.g. the 29 नियम) — renders
// as a non-clickable "शीघ्र उपलब्ध" card instead of a dead link. Any book not
// covered here still shows up in the plain list below.
const FEATURED_CARD = {
  id: 'shabadvani',
  image: 'assets/images/prayers.jpeg',
  imageLabel: 'पावन पोथी',
  badge: (book) => `प्रधान पवित्र ग्रंथ • ${book.shabadCount} पावन शब्द`,
  tag: 'शब्दवाणी',
  title: 'श्री गुरु जम्भेश्वर शब्दवाणी',
  description: 'विष्णु विष्णु तू भणरे प्राणी, जो मन मानै रे भाई। दिन का भूला रात न चेता, कांय पड़ा सूता।',
  pills: (book) => [`${book.shabadCount} शब्द`],
  cta: (book) => `संपूर्ण शब्दवाणी पाठ प्रारंभ करें`,
  // note: 'क्रमबद्ध स्वाध्याय',
};

const CATEGORY_CARDS = [
  {
    id: 'arti',
    tone: 'green',
    thumb: 'assets/images/aarti.jpg',
    badge: 'नित्य स्तुति',
    badgeTone: 'green',
    title: 'आरती, साखी व नित्य पाठ',
    description: 'संध्या आरती, साखी संग्रह एवं प्रातः-सायं वंदना का संकलन।',
    cta: 'स्तुति पढ़ें',
  },
  {
    id: null,
    tone: 'green',
    iconName: 'eco',
    badge: 'जीवन सूत्र',
    badgeTone: 'green-muted',
    title: 'उन्नतीस (29) धर्म नियम',
    description: 'विश्व की प्रथम सुव्यवस्थित पर्यावरण संहिता: वृक्ष रक्षा, जीव दया, शुचिता, सत्य, एवं नैतिक जीवन आधार।',
    cta: '29 नियम विवरण',
  },
  {
    id: 'shabad-sangrah',
    tone: 'saffron',
    iconName: 'historyEdu',
    badge: 'पोथी व इतिहास',
    badgeTone: 'neutral',
    title: 'जम्भसार व ऐतिहासिक ग्रंथ',
    description: 'संत सुरजन जी, वील्हो जी, आलम जी की रचनाएं; प्राचीन हस्तलिखित पाण्डुलिपियों व पोथियों का संकलन।',
    cta: 'अभिलेख देखें',
  },
];


// Quick-index chips under the home banner. Only books that actually exist
// in books.json are shown, so a chip never leads to an empty page.
const BANNER_LINKS = [
  { id: 'shabadvani', label: '120 शब्द', tone: 'saffron' },
  { id: 'arti', label: 'नित्य आरती', tone: 'green' },
  { id: 'shabad-sangrah', label: 'अन्य पुस्तकें', tone: 'saffron' },
];

function featuredCardHtml(config, book) {
  const pills = config.pills(book).map((pill) => `<span class="cat-feature-pill">${escapeHtml(pill)}</span>`).join('');
  return `
    <a class="cat-feature" href="#/book/${book.id}" data-nav>
      <div class="cat-feature-glow" aria-hidden="true"></div>
      <div class="cat-feature-media">
        <img src="content/${config.image}" alt="" loading="lazy" />
        <span class="cat-feature-media-label dn">${escapeHtml(config.imageLabel)}</span>
      </div>
      <div class="cat-feature-body">
        <div>
          <div class="cat-feature-badges dn">
            <span class="cat-feature-badge">★ ${escapeHtml(config.badge(book))}</span>
            <span class="cat-feature-tag">${escapeHtml(config.tag)}</span>
          </div>
          <h4 class="cat-feature-title dn">${escapeHtml(config.title)}</h4>
          <p class="cat-feature-desc dn">${escapeHtml(config.description)}</p>
          <div class="cat-feature-pills dn">${pills}</div>
        </div>
        <div class="cat-feature-foot dn">
          <span class="cat-feature-cta">${escapeHtml(config.cta(book))}${icon('east')}</span>
        </div>
      </div>
    </a>`;
}

function categoryCardHtml(config, book) {
  const media = config.thumb
    ? `<span class="cat-card-thumb"><img src="content/${config.thumb}" alt="" loading="lazy" /></span>`
    : `<span class="cat-card-thumb cat-card-thumb--icon">${icon(config.iconName)}</span>`;
  const inner = `
    <div>
      <div class="cat-card-top">
        ${media}
        <span class="cat-card-badge cat-card-badge--${config.badgeTone} dn">${escapeHtml(config.badge)}</span>
      </div>
      <h4 class="cat-card-title dn">${escapeHtml(config.title)}</h4>
      <p class="cat-card-desc dn">${escapeHtml(config.description)}</p>
    </div>
    <div class="cat-card-foot dn">
      <span>${escapeHtml(book ? config.cta : 'शीघ्र उपलब्ध')}</span>
      ${book ? icon('east') : ''}
    </div>`;

  return book
    ? `<a class="cat-card cat-card--${config.tone}" href="#/book/${book.id}" data-nav>${inner}</a>`
    : `<div class="cat-card cat-card--${config.tone} cat-card--soon" aria-disabled="true">${inner}</div>`;
}

// Khejarli martyrdom memorial (Stitch "eco-heritage" card). There's no
// Khejarli history page yet, so the CTA renders as a muted "शीघ्र उपलब्ध"
// pill rather than a dead link.
const KHEJARLI_STATS = [
  { value: '363', label: 'अमर बलिदानी', tone: 'green' },
  { value: '29', label: 'पावन नियम', tone: 'saffron' },
  { value: '500+', label: 'वर्ष अखंड परंपरा', tone: 'ochre' },
];

function khejarliMemorialHtml() {
  const stats = KHEJARLI_STATS.map((stat) => `
    <div class="khejarli-stat">
      <span class="khejarli-stat-value khejarli-stat-value--${stat.tone} dn">${stat.value}</span>
      <span class="khejarli-stat-label dn">${stat.label}</span>
    </div>`).join('');
  return `
    <section class="khejarli">
      <div class="khejarli-head">
        <div class="khejarli-text">
          <div class="khejarli-kicker dn">${icon('forest')}<span>विश्व की प्रथम पर्यावरण रक्षा क्रांति • सं0 1787</span></div>
          <h3 class="khejarli-quote dn">"सिर साठे रूंख रहे तो भी सस्तो जाण"</h3>
          <p class="khejarli-desc dn">माता अमृता देवी विश्नोई एवं 363 धर्मनिष्ठ नर-नारियों द्वारा हरे खेजड़ी वृक्षों की रक्षा हेतु अपने प्राणों का अमर उत्सर्ग।</p>
        </div>
        <span class="khejarli-cta khejarli-cta--soon dn" aria-disabled="true">इतिहास व दर्शन — शीघ्र उपलब्ध</span>
      </div>
    </section>`;
}

export async function render(container, params, ctx) {
  const books = await loadBooks();
  const byId = new Map(books.map((book) => [book.id, book]));

  const featuredBook = byId.get(FEATURED_CARD.id);
  const featuredCard = featuredBook ? featuredCardHtml(FEATURED_CARD, featuredBook) : '';
  const categoryCards = CATEGORY_CARDS
    .map((config) => categoryCardHtml(config, config.id ? byId.get(config.id) : null))
    .join('');
  const quickLinks = BANNER_LINKS
    .filter((link) => byId.has(link.id))
    .map((link) => `<a class="home-banner-link home-banner-link--${link.tone}" href="#/book/${link.id}" data-nav><span class="home-banner-dot"></span>${link.label}</a>`)
    .join('<span class="home-banner-sep" aria-hidden="true">•</span>');
  const featuredIds = new Set([FEATURED_CARD.id, ...CATEGORY_CARDS.map((c) => c.id).filter(Boolean)]);
  const otherBooks = books.filter((book) => !featuredIds.has(book.id));

  const rows = otherBooks.map((book) => {
    const index = books.indexOf(book);
    const progress = bookProgress(book);
    let metaLabel = 'अपठित';
    if (progress.status === 'complete') metaLabel = 'पूर्ण पठित';
    else if (progress.status === 'partial') metaLabel = `${progress.pct}% पठित`;

    return `
      <a class="book-row" href="#/book/${book.id}" data-nav>
        ${renderCover(book, index)}
        <div style="flex:1;min-width:0">
          <div class="book-title dn">${escapeHtml(book.title)}</div>
          <div class="book-meta dn">${book.shabadCount} शब्द · ${metaLabel}</div>
        </div>
      </a>`;
  }).join('');

  container.innerHTML = `
    <div class="scripture">
      <section class="home-banner">
        <div class="home-banner-watermark" aria-hidden="true"><img src="content/assets/images/om.png" alt="" /></div>
        <div class="home-banner-inner">
          <div class="home-banner-chip dn">${icon('lotus')}<span>॥ श्री गुरु जम्भेश्वराय नमः ॥</span>${icon('lotus')}</div>
          <h1 class="home-banner-title dn">बिश्नोई सम्प्रदाय की समस्त <span class="home-banner-accent">शब्दवाणी</span>, एक स्थान पर</h1>
          <p class="home-banner-subtitle dn">परम पूज्य गुरु जम्भेश्वर भगवान के 120 पावन शब्द, आरती, साखी व 29 पावन नियमों का प्रामाणिक, शोधपरक डिजिटल अभिलेखागार।</p>
        </div>
      </section>
      ${categoryCards ? `
        <section class="cat-section">
          <div class="cat-section-head">
            <div>
              <span class="cat-section-kicker dn">संग्रह व अध्ययन</span>
              <h3 class="cat-section-title dn">मुख्य ग्रंथ व साहित्य श्रेणियां</h3>
            </div>
            ${icon('library')}
          </div>
          ${featuredCard}
          <div class="cat-grid">${categoryCards}</div>
        </section>
      ` : ''}
      ${khejarliMemorialHtml()}
      ${otherBooks.length ? `
        <p class="sec-label dn">अधिक पुस्तकें</p>
        <div class="book-list grid">${rows}</div>
      ` : ''}
      ${!categoryCards && !otherBooks.length ? `<div class="empty-state">${icon('book')}<p>अभी कोई पुस्तक उपलब्ध नहीं है</p></div>` : ''}
    </div>
  `;

  ctx.setHeader({ title });
}
