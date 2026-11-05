/**
 * This portal's configuration: the only file a fork needs to edit.
 * What each field means: src/config.ts. Check it against the live API with
 * `npm run check`.
 *
 * One plain "Carmona" search, with every line that isn't Carmona's removed by
 * hand. The search catches 10 DPWH lines for 2027 and 133 enacted programs for
 * 2020 to 2026. Narrower searches would leave namesakes out too, but with no
 * published reason, and would also miss real lines: "Carmona, Cavite" finds no
 * 2027 line, and "Carmona City" finds no "Carmona, Cavite" program.
 *
 * No region on the place: the DPWH motorpool line in Carmona City is listed
 * under Central Office in NCR, so a IV-A filter would drop it.
 *
 * A road between Carmona and another town stays out unless the title places it
 * in Carmona. The Carmona-Silang Diversion Road is the exception: it stays in, in
 * full, and is marked as having an unknown share. See `notes` below.
 *
 * Re-run `npm run check -- --verbose` when the API's data is rebuilt. A new line
 * naming Carmona appears here until it is reviewed.
 */
import { defineConfig } from './src/config';

export default defineConfig({
  id: 'carmona-cavite',
  kind: 'city',
  name: 'BetterCarmona',
  shortName: 'Carmona',
  tagline: 'A community budget watch for Carmona, Cavite',
  officialSite: { label: 'Official Carmona website', url: 'https://carmonagov.net/portal/' },
  statement: 'An independent community initiative. Not an official government website.',
  operator: {
    name: '@carlolim',
    url: 'https://github.com/carlolim',
    note: 'a private citizen, not affiliated with the City Government of Carmona',
  },
  logo: '/brand/bettercarmona-logo.svg',
  logoDark: '/brand/bettercarmona-logo-reverse.svg',
  siteUrl: 'https://bettercarmona.org',
  buildYourOwnStrip: false,
  scope: {
    // Cavite 3rd DEO also serves other towns, so its whole ledger isn't listed
    // here. Its total shows on the district card.
    offices: [],
    places: [{ label: 'Carmona', q: 'Carmona' }],
    // The official portal lists "Congressman 5th District of Cavite":
    // https://carmonagov.net/portal/elected-officials/
    districts: ['leg:cavite:5th'],
    exclude: [
      {
        key: 'dpwh:house-reading:3596',
        reason: 'Barangay Carmona is in Makati City, as the title says. It matched only because the barangay shares the name.',
      },
      {
        key: 'gaa:18-001|carmona br  b01095lz  along cagayan valley rd',
        reason: 'A bridge named Carmona on Cagayan Valley Road. The title does not place it in Carmona, Cavite. It matched only because the bridge shares the name.',
      },
      {
        key: 'gaa:18-001|carmona br b01095lz along maharlika highway  cagayan valley rd phase ii',
        reason: 'A bridge named Carmona on Cagayan Valley Road. The title does not place it in Carmona, Cavite. It matched only because the bridge shares the name.',
      },
      {
        key: 'gaa:18-001|regionwidenationwide  flood control  major river basins principal rivers  detailed engineering design of flood management and water infrastructure for sta rosa bian and carmona river basins',
        reason: 'A design study covering the Sta. Rosa, Biñan, and Carmona river basins, funded as a regionwide line. The title does not say what share is for Carmona.',
      },
      {
        key: 'gaa:18-001|carmona  bian diversion road sta 1  751  2  000 sta 2  039  2  320 sta 3  147  3  352 sta 5  918  6  211',
        reason: 'A road between Carmona and Biñan, Laguna. The title does not say which part lies in Carmona, so it is left out until the share is known.',
      },
      {
        key: 'gaa:18-001|dasmariasgmacarmona road',
        reason: 'A road linking Dasmariñas, General Mariano Alvarez, and Carmona. The title does not say which part lies in Carmona, so it is left out until the share is known.',
      },
      {
        key: 'gaa:18-001|regionwidenationwide  roads and bridges  conduct of feasibility studies preliminary and detailed engineering economic analysis technical studies traffic impact assessment  region iva  dasmariasgeneral mariano alvarezcarmona bypass road cavite',
        reason: 'A study for a road linking Dasmariñas, General Mariano Alvarez, and Carmona, funded as a regionwide line. The title does not say what share is for Carmona.',
      },
      {
        key: 'gaa:18-001|construction of drainage main along h santos st towards barangay carmona pumping station including one 1 unit additional pump and sump pit with accessories barangay carmona makati city',
        reason: 'Barangay Carmona is in Makati City, as the title says. It matched only because the barangay shares the name.',
      },
      {
        key: 'gaa:18-001|construction of 4 classrooms sofronio carmona national high school barangay bagong silang salvado benedicto negros occidental',
        reason: 'Sofronio Carmona National High School is in Salvador Benedicto, Negros Occidental, as the title says. It matched only because the school shares the name.',
      },
      {
        key: 'gaa:18-001|construction of multi  purpose building sofronio carmona nhs barangay bagong silang salvador benedicto negros occidental',
        reason: 'Sofronio Carmona National High School is in Salvador Benedicto, Negros Occidental, as the title says. It matched only because the school shares the name.',
      },
      {
        key: 'gaa:18-001|construction of multipurpose building covered court sofronio carmona national high school brgy igmayaan salvador benedicto negros occidental',
        reason: 'Sofronio Carmona National High School is in Salvador Benedicto, Negros Occidental, as the title says. It matched only because the school shares the name.',
      },
      {
        key: 'gaa:18-001|construction of dasmariasgeneral mariano alvarezcarmona bypass road dasmarias city cavite',
        reason: 'The title places this section in Dasmariñas, Cavite, not Carmona. It matched because the road is named after the towns it links.',
      },
      {
        key: 'gaa:18-001|construction of dasmariasgeneral mariano alvarezcarmona bypass road dasmarias cavite',
        reason: 'The title places this section in Dasmariñas, Cavite, not Carmona. It matched because the road is named after the towns it links.',
      },
      {
        key: 'gaa:18-001|construction of diversionbypass road dasmariasgeneral mariano alvarezcarmona bypass road dasmarias city cavite',
        reason: 'The title places this section in Dasmariñas, Cavite, not Carmona. It matched because the road is named after the towns it links.',
      },
      {
        key: 'gaa:18-001|construction of dasmariasgeneral mariano alvarezcarmona bypass road general mariano alvarez cavite',
        reason: 'The title places this section in General Mariano Alvarez, Cavite, not Carmona. It matched because the road is named after the towns it links.',
      },
      {
        key: 'gaa:18-001|carmona  bian bypass road bian section laguna',
        reason: 'The title places this work in Biñan, Laguna, not Carmona. It matched because the road or river is named after both places.',
      },
      {
        key: 'gaa:18-001|carmonabian bypass road bian section laguna',
        reason: 'The title places this work in Biñan, Laguna, not Carmona. It matched because the road or river is named after both places.',
      },
      {
        key: 'gaa:18-001|carmonabian diversion road bian section laguna',
        reason: 'The title places this work in Biñan, Laguna, not Carmona. It matched because the road or river is named after both places.',
      },
      {
        key: 'gaa:18-001|construction of carmona  bian extension road bian section laguna',
        reason: 'The title places this work in Biñan, Laguna, not Carmona. It matched because the road or river is named after both places.',
      },
      {
        key: 'gaa:18-001|construction of detention pond at brgy mamplasan including outfall leading to tributary creek of carmonabian river bian city laguna',
        reason: 'The title places this work in Biñan, Laguna, not Carmona. It matched because the road or river is named after both places.',
      },
      {
        key: 'gaa:18-001|constructionimprovement of tributary creek as outfall of the detention pond at brgy mamplasan leading to carmona  bian river bian city laguna',
        reason: 'The title places this work in Biñan, Laguna, not Carmona. It matched because the road or river is named after both places.',
      },
      {
        key: 'gaa:18-001|rehabilitation of carmona  bian road malvar street barangay san vicente bian city laguna',
        reason: 'The title places this work in Biñan, Laguna, not Carmona. It matched because the road or river is named after both places.',
      },
      {
        key: 'gaa:18-001|construction of flood protection structure phase 1 biancarmona boundary bian side bian city laguna',
        reason: 'The title places this work in Biñan, Laguna, on the Biñan side of the boundary with Carmona.',
      },
      {
        key: 'gaa:18-001|construction of flood protection structure phase 2 biancarmona boundary bian side bian city laguna',
        reason: 'The title places this work in Biñan, Laguna, on the Biñan side of the boundary with Carmona.',
      },
      {
        key: 'gaa:18-001|construction of flood protection structure phase 3 biancarmona boundary bian side bian city laguna',
        reason: 'The title places this work in Biñan, Laguna, on the Biñan side of the boundary with Carmona.',
      },
      {
        key: 'gaa:18-001|construction of flood protection structure phase 4 biancarmona boundary bian side bian city laguna',
        reason: 'The title places this work in Biñan, Laguna, on the Biñan side of the boundary with Carmona.',
      },
      {
        key: 'gaa:18-001|construction of revetment along carmona river phase 1 brgy san gabriel gen mariano alvarez cavite',
        reason: 'The title places this work in General Mariano Alvarez, Cavite, not Carmona. It matched because of the Carmona River.',
      },
      {
        key: 'gaa:18-001|construction of slope protection works along carmona river phase 1 gen mariano alvarez cavite',
        reason: 'The title places this work in General Mariano Alvarez, Cavite, not Carmona. It matched because of the Carmona River.',
      },
      {
        key: 'gaa:18-001|construction of bank and slope structures and other improvements along carmona river from brgy bulihan to brgy ipil silang cavite',
        reason: 'The title places this work in Silang, Cavite, not Carmona. It matched because of the Carmona River.',
      },
      {
        key: 'gaa:18-001|construction andor repairrehabilitation of multipurpose building brgy san pablo 1 carmona cavite',
        reason: 'The title says Carmona, Cavite, but the official portal lists 14 barangays and this one is not among them. Left out until the location is confirmed.',
      },
      {
        key: 'gaa:18-001|constructionrehabilitation of multipurpose building in barangay santol 5d carmona cavite',
        reason: 'The title says Carmona, Cavite, but the official portal lists 14 barangays and this one is not among them. Left out until the location is confirmed.',
      },
    ],
    notes: [
      {
        note: 'This road runs between Carmona and Silang. The titles do not say how much of the work is in Carmona, so the whole amount is shown.',
        shareUnknown: true,
        keys: [
          'gaa:18-001|carmonasilang diversion road sta 9  200  sta 9  600 cavite',
          'gaa:18-001|carmona  silang diversion road cavite',
          'gaa:18-001|carmona  silang diversion road via sugar roaddavilanmaguyam road cavite',
          'gaa:18-001|carmonasilang diversion road via sugar roaddavilanmaguyam road cavite',
          'gaa:18-001|construction of carmona  silang diversion road cavite',
          'gaa:18-001|installation of solar street light along carmonasilang diversion road',
          'gaa:18-001|regionwide  nationwide  roads and bridges  feasibility studies preliminary and detailed engineering economic analysis technical studies traffic impact assessment  region iva  fullscale feasibility study of the carmona silang diversion road sugar roadslex carmona exit access road',
        ],
      },
      {
        note: 'The title names no town. It is read here as the Carmona Diversion Road, the part of Governor\'s Drive that bypasses Carmona\'s town proper (Wikipedia, Governor\'s Drive, read on 2026-11-05). That is a different road from the Carmona-Biñan Diversion Road. The 2027 NEP lists this road under the Cavite 3rd District Engineering Office.',
        keys: [
          'dpwh:house-reading:442',
          'gaa:18-001|carmona div rd  k0047  628  k0047  803',
          'gaa:18-001|carmona div rd  k0047  584  k0047  598 k0048  398  k0048  498 k0048  676  k0048  719',
          'gaa:18-001|carmona div rd  k0047  774  k0047  744 k0047  804  k0047  774 k0047  528  k0048  156',
          'gaa:18-001|carmona div rd  k0048  15330  k0048  462',
          'gaa:18-001|carmona div rd  k0048  207  k0048  719',
          'gaa:18-001|carmona div rd  k0048  46680  k0048  723',
          'gaa:18-001|preventive maintenance asphalt overlay along carmona div rd  k0047  744  k0047  528',
        ],
      },
      {
        note: 'The title names no town. The bridge is named Carmona and is on Juanito R. Remulla Sr. Road, which other lines here place in Carmona, Cavite.',
        keys: [
          'gaa:18-001|carmona br b02913lz along juanito r remulla sr rd',
        ],
      },
      {
        note: 'The title says only Cavite. It is read here as the Carmona side, because the road\'s Biñan section in Laguna is a separate line.',
        keys: [
          'gaa:18-001|construction of carmona  bian extension road cavite',
        ],
      },
    ],
  },
  reporting: { enabled: false },
});
