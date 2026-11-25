import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ARTWORKS, HALL_LIST, HALLS, artworksOfHall } from '../src/data/gallery.js'

// Every hall and every painting gets its own HTML file after the bundle is
// built, so search engines and link previews see real titles, descriptions and
// text without running JavaScript. The app bootstraps from the same markup.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const base = (process.env.BASE_PATH || '/').replace(/\/*$/, '/')
const site = (process.env.SITE_URL || '').replace(/\/+$/, '')

const SITE_NAME = 'گالری آریانا'
const HOME_DESCRIPTION =
  'گالری هنری مجازی؛ سالن اصلی و پنج سالن نمایشگاهی با بیست‌ویک اثر از هنرمندان معاصر ایران.'

const absolute = (path) => (site ? `${site}${path}` : path)
const urlFor = (path) => absolute(`${base}${path}`.replace(/\/{2,}/g, '/'))
const fileFor = (path) => join(dist, ...path.split('/').filter(Boolean), 'index.html')

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`

const template = readFileSync(join(dist, 'index.html'), 'utf8')

function renderPage({ title, description, image, canonical, structured, body }) {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}">`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${esc(description)}">`
    )
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)

  const head = [
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    image ? `<meta property="og:image" content="${esc(image)}">` : '',
    structured ? jsonLd(structured) : '',
  ]
    .filter(Boolean)
    .join('\n    ')

  return html.replace('</head>', `    ${head}\n  </head>`)
}

function artworkBody(art) {
  const thumb = `${base}art/thumb/${art.img.split('/').pop()}`
  return [
    '<main>',
    `<h1>${esc(art.title)}</h1>`,
    `<p>${esc(art.artist)} · ${esc(art.year)}</p>`,
    `<img src="${esc(thumb)}" alt="${esc(`${art.title} — ${art.artist}`)}" loading="lazy">`,
    '<dl>',
    `<div><dt>سال خلق</dt><dd>${esc(art.year)}</dd></div>`,
    `<div><dt>تکنیک و متریال</dt><dd>${esc(art.medium)}</dd></div>`,
    `<div><dt>ابعاد</dt><dd>${esc(art.dims)}</dd></div>`,
    `<div><dt>شمارهٔ شناسایی</dt><dd>${esc(art.id)}</dd></div>`,
    '</dl>',
    `<p>${esc(art.desc)}</p>`,
    `<p><a href="${esc(urlFor(`${art.hall}/`))}">${esc(HALLS[art.hall].name)} — ${esc(HALLS[art.hall].tagline)}</a></p>`,
    '</main>',
  ].join('\n')
}

function hallBody(hall) {
  const works = artworksOfHall(hall.id)
  const items = works
    .map(
      (art) => `      <li><a href="${esc(urlFor(`${art.hall}/${art.id}/`))}">
        <img src="${esc(`${base}art/thumb/${art.img.split('/').pop()}`)}" alt="${esc(`${art.title} — ${art.artist}`)}" loading="lazy">
        <h3>${esc(art.title)}</h3>
        <p>${esc(art.artist)} · ${esc(art.year)} · ${esc(art.dims)}</p>
        <p>${esc(art.desc)}</p>
      </a></li>`
    )
    .join('\n')

  return [
    '<main>',
    `<h1>${esc(hall.name)} — ${esc(hall.tagline)}</h1>`,
    `<p>${esc(hall.en)}</p>`,
    `<p>${works.length} اثر</p>`,
    '<ul>',
    items,
    '</ul>',
    '</main>',
  ].join('\n')
}

const urls = []

// Home
const homeCanonical = urlFor('')
const homeBody = [
  '<main>',
  `<h1>${esc(SITE_NAME)}</h1>`,
  `<p>${esc(HOME_DESCRIPTION)}</p>`,
  '<ul>',
  ...HALL_LIST.map(
    (hall) => `  <li><a href="${esc(urlFor(hall.id === 'lobby' ? '' : `${hall.id}/`))}">${esc(hall.name)} — ${esc(hall.tagline)}</a></li>`
  ),
  '</ul>',
  '<ul>',
  ...ARTWORKS.map(
    (art) => `  <li><a href="${esc(urlFor(`${art.hall}/${art.id}/`))}">${esc(art.title)} — ${esc(art.artist)}</a></li>`
  ),
  '</ul>',
  '</main>',
].join('\n')

writeFileSync(
  join(dist, 'index.html'),
  renderPage({
    title: `${SITE_NAME} — گالری هنری مجازی`,
    description: HOME_DESCRIPTION,
    image: absolute(`${base}art/art-01.webp`),
    canonical: homeCanonical,
    structured: {
      '@context': 'https://schema.org',
      '@type': 'ArtGallery',
      name: SITE_NAME,
      description: HOME_DESCRIPTION,
      url: homeCanonical,
    },
    body: homeBody,
  })
)
urls.push(homeCanonical)

// Halls (the lobby also answers on /lobby/)
for (const hall of HALL_LIST) {
  const paths = hall.id === 'lobby' ? ['lobby/'] : [`${hall.id}/`]
  for (const path of paths) {
    const canonical = urlFor(path)
    const file = fileFor(path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(
      file,
      renderPage({
        title: `${hall.name} — ${hall.tagline} — ${SITE_NAME}`,
        description: `${hall.name} — ${hall.tagline} · ${hall.en}. ${HOME_DESCRIPTION}`,
        image: absolute(`${base}art/art-01.webp`),
        canonical,
        structured: {
          '@context': 'https://schema.org',
          '@type': 'ArtGallery',
          name: hall.name,
          description: hall.tagline,
          url: canonical,
        },
        body: hallBody(hall),
      })
    )
    urls.push(canonical)
  }
}

// Artworks
for (const art of ARTWORKS) {
  const path = `${art.hall}/${art.id}/`
  const canonical = urlFor(path)
  const file = fileFor(path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(
    file,
    renderPage({
      title: `${art.title} — ${art.artist} — ${SITE_NAME}`,
      description: `${art.title}، ${art.artist} (${art.year}). ${art.medium}. ${art.dims}.`,
      image: absolute(`${base}${art.img.replace(/^\/+/, '')}`),
      canonical,
      structured: {
        '@context': 'https://schema.org',
        '@type': 'VisualArtwork',
        name: art.title,
        creator: { '@type': 'Person', name: art.artist },
        dateCreated: art.year,
        artMedium: art.medium,
        size: art.dims,
        description: art.desc,
        image: absolute(`${base}${art.img.replace(/^\/+/, '')}`),
        url: canonical,
        isPartOf: { '@type': 'ArtGallery', name: SITE_NAME, url: homeCanonical },
      },
      body: artworkBody(art),
    })
  )
  urls.push(canonical)
}

// Sitemap and robots
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((url) => `  <url><loc>${esc(url)}</loc></url>`),
  '</urlset>',
  '',
].join('\n')

writeFileSync(join(dist, 'sitemap.xml'), sitemap)
// A robots.txt Sitemap line has to be absolute, so it only appears once
// SITE_URL names the deployment.
const robots = ['User-agent: *', 'Allow: /', '']
if (site) robots.splice(2, 0, `Sitemap: ${absolute(`${base}sitemap.xml`)}`, '')
writeFileSync(join(dist, 'robots.txt'), robots.join('\n'))

console.log(`wrote ${urls.length} static pages, sitemap.xml and robots.txt${site ? ` for ${site}` : ' (relative URLs)'}`)
