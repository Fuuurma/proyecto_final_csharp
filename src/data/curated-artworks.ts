import type { Artwork } from "@/lib/met/normalize";

type CuratedSeed = {
  id: number;
  title: string;
  displayTitle?: string;
  artist?: string | null;
  artistBio?: string | null;
  date?: string | null;
  culture?: string | null;
  period?: string | null;
  medium?: string | null;
  dimensions?: string | null;
  department: string;
  classification?: string | null;
  primaryImage: string;
  primaryImageSmall: string;
  additionalImages?: string[];
  imageAspectRatio: number;
  accessionNumber?: string | null;
  creditLine?: string | null;
  tags?: string[];
};

function curatedArtwork(seed: CuratedSeed): Artwork {
  return {
    id: seed.id,
    accessionNumber: seed.accessionNumber ?? null,
    title: seed.title,
    displayTitle: seed.displayTitle ?? seed.title,
    artist: seed.artist ?? null,
    artistBio: seed.artistBio ?? null,
    date: seed.date ?? null,
    culture: seed.culture ?? null,
    period: seed.period ?? null,
    medium: seed.medium ?? null,
    dimensions: seed.dimensions ?? null,
    department: seed.department,
    classification: seed.classification ?? null,
    primaryImage: seed.primaryImage,
    primaryImageSmall: seed.primaryImageSmall,
    additionalImages: seed.additionalImages ?? [],
    imageAspectRatio: seed.imageAspectRatio,
    isPublicDomain: true,
    rights: null,
    creditLine: seed.creditLine ?? null,
    canonicalUrl: `https://www.metmuseum.org/art/collection/search/${seed.id}`,
    tags: seed.tags ?? [],
  };
}

export const curatedArtworks = [
  curatedArtwork({
    id: 436535,
    accessionNumber: "1993.132",
    title: "Wheat Field with Cypresses",
    artist: "Vincent van Gogh",
    artistBio: "Dutch, Zundert 1853–1890 Auvers-sur-Oise",
    date: "1889",
    medium: "Oil on canvas",
    dimensions: "28 13/16 × 36 3/4 in. (73.2 × 93.4 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP-42549-001.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP-42549-001.jpg",
    additionalImages: [
      "https://images.metmuseum.org/CRDImages/ep/original/LC-EP_1993_132_suppl_CH-004.jpg",
      "https://images.metmuseum.org/CRDImages/ep/original/LC-EP_1993_132_suppl_CH-003.jpg",
      "https://images.metmuseum.org/CRDImages/ep/original/LC-EP_1993_132_suppl_CH-002.jpg",
      "https://images.metmuseum.org/CRDImages/ep/original/LC-EP_1993_132_suppl_CH-001.jpg",
    ],
    imageAspectRatio: 1.385,
    creditLine: "Purchase, The Annenberg Foundation Gift, 1993",
    tags: ["Landscapes", "Cypresses", "Summer"],
  }),
  curatedArtwork({
    id: 436524,
    accessionNumber: "49.41",
    title: "Sunflowers",
    artist: "Vincent van Gogh",
    artistBio: "Dutch, Zundert 1853–1890 Auvers-sur-Oise",
    date: "1887",
    medium: "Oil on canvas",
    dimensions: "17 × 24 in. (43.2 × 61 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP-41223-001.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP-41223-001.jpg",
    imageAspectRatio: 1.412,
    creditLine: "Rogers Fund, 1949",
    tags: ["Sunflowers", "Still Life"],
  }),
  curatedArtwork({
    id: 436528,
    accessionNumber: "58.187",
    title: "Irises",
    artist: "Vincent van Gogh",
    artistBio: "Dutch, Zundert 1853–1890 Auvers-sur-Oise",
    date: "1890",
    medium: "Oil on canvas",
    dimensions: "29 × 36 1/4 in. (73.7 × 92.1 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP346474.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP346474.jpg",
    imageAspectRatio: 1.25,
    creditLine: "Gift of Adele R. Levy, 1958",
    tags: ["Flowers", "Still Life"],
  }),
  curatedArtwork({
    id: 56353,
    accessionNumber: "JP2972",
    title:
      "Under the Wave off Kanagawa (Kanagawa oki nami ura), also known as The Great Wave, from the series Thirty-six Views of Mount Fuji (Fugaku sanjūrokkei)",
    displayTitle: "The Great Wave",
    artist: "Katsushika Hokusai",
    artistBio: "Japanese, Tokyo (Edo) 1760–1849 Tokyo (Edo)",
    date: "ca. 1830–32",
    culture: "Japan",
    period: "Edo period (1615–1868)",
    medium: "Woodblock print",
    dimensions: "9 7/8 × 14 7/8 in. (25.1 × 37.8 cm)",
    department: "Asian Art",
    classification: "Prints",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/as/original/DP141067.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/as/web-large/DP141067.jpg",
    imageAspectRatio: 1.506,
    creditLine:
      "Henry L. Phillips Collection, Bequest of Henry L. Phillips, 1939",
    tags: ["Volcanoes", "Waves", "Boats"],
  }),
  curatedArtwork({
    id: 436534,
    accessionNumber: "1993.400.5",
    title: "Roses",
    artist: "Vincent van Gogh",
    artistBio: "Dutch, Zundert 1853–1890 Auvers-sur-Oise",
    date: "1890",
    medium: "Oil on canvas",
    dimensions: "36 5/8 × 29 1/8 in. (93 × 74 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP346475.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP346475.jpg",
    imageAspectRatio: 0.796,
    creditLine:
      "The Walter H. and Leonore Annenberg Collection, Gift of Walter H. Annenberg, 1993, Bequest of Walter H. Annenberg, 2002",
    tags: ["Roses", "Still Life"],
  }),
  curatedArtwork({
    id: 437386,
    accessionNumber: "29.100.3",
    title: "Portrait of a Man, probably a Member of the Van Beresteyn Family",
    displayTitle: "Portrait of a Man",
    artist: "Rembrandt (Rembrandt van Rijn)",
    artistBio: "Dutch, Leiden 1606–1669 Amsterdam",
    date: "1632",
    medium: "Oil on canvas",
    dimensions: "44 × 35 in. (111.8 × 88.9 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP121326.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP121326.jpg",
    imageAspectRatio: 0.795,
    creditLine:
      "H. O. Havemeyer Collection, Bequest of Mrs. H. O. Havemeyer, 1929",
    tags: ["Men", "Portraits"],
  }),
  curatedArtwork({
    id: 436880,
    accessionNumber: "87.8.12",
    title: "The Organ Rehearsal",
    artist: "Henry Lerolle",
    artistBio: "French, Paris 1848–1929 Paris",
    date: "1885",
    medium: "Oil on canvas",
    dimensions: "93 1/4 × 142 3/4 in. (236.9 × 362.6 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP160223.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP160223.jpg",
    imageAspectRatio: 1.531,
    creditLine: "Gift of George I. Seney, 1887",
    tags: ["Men", "Women", "Musicians", "Singers"],
  }),
  curatedArtwork({
    id: 437430,
    accessionNumber: "29.100.125",
    title: "By the Seashore",
    artist: "Auguste Renoir",
    artistBio: "French, Limoges 1841–1919 Cagnes-sur-Mer",
    date: "1883",
    medium: "Oil on canvas",
    dimensions: "36 1/4 × 28 1/2 in. (92.1 × 72.4 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP-14936-039.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP-14936-039.jpg",
    imageAspectRatio: 0.786,
    creditLine:
      "H. O. Havemeyer Collection, Bequest of Mrs. H. O. Havemeyer, 1929",
    tags: ["Portraits", "Women"],
  }),
  curatedArtwork({
    id: 435877,
    accessionNumber: "29.100.64",
    title: "Mont Sainte-Victoire and the Viaduct of the Arc River Valley",
    artist: "Paul Cézanne",
    artistBio: "French, Aix-en-Provence 1839–1906 Aix-en-Provence",
    date: "1882–85",
    medium: "Oil on canvas",
    dimensions: "25 3/4 × 32 1/8 in. (65.4 × 81.6 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP-20099-001.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP-20099-001.jpg",
    imageAspectRatio: 1.248,
    creditLine:
      "H. O. Havemeyer Collection, Bequest of Mrs. H. O. Havemeyer, 1929",
    tags: ["Bridges", "Mountains", "Landscapes"],
  }),
  curatedArtwork({
    id: 441104,
    accessionNumber: "2010.454",
    title: "Still Life with Flowers and Prickly Pears",
    artist: "Auguste Renoir",
    artistBio: "French, Limoges 1841–1919 Cagnes-sur-Mer",
    date: "ca. 1885",
    medium: "Oil on canvas",
    dimensions: "28 7/8 × 23 3/8 in. (73.3 × 59.4 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP257756.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP257756.jpg",
    imageAspectRatio: 0.81,
    creditLine: "Bequest of Catherine Vance Gaisman, 2010",
    tags: ["Pears", "Flowers", "Still Life", "Vases"],
  }),
  curatedArtwork({
    id: 437999,
    accessionNumber: "1997.391.2",
    title: "Still Life with Teapot and Fruit",
    artist: "Paul Gauguin",
    artistBio: "French, Paris 1848–1903 Atuona, Hiva Oa, Marquesas Islands",
    date: "1896",
    medium: "Oil on canvas",
    dimensions: "18 3/4 × 26 in. (47.6 × 66 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DT1027.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DT1027.jpg",
    imageAspectRatio: 1.387,
    creditLine:
      "The Walter H. and Leonore Annenberg Collection, Gift of Walter H. Annenberg, 1997, Bequest of Walter H. Annenberg, 2002",
    tags: ["Fruit", "Still Life", "Teapots"],
  }),
  curatedArtwork({
    id: 438002,
    accessionNumber: "1997.391.4",
    title: "Madame Manet (Suzanne Leenhoff, 1829–1906) at Bellevue",
    artist: "Edouard Manet",
    artistBio: "French, Paris 1832–1883 Paris",
    date: "1880",
    medium: "Oil on canvas",
    dimensions: "31 3/4 × 23 3/4 in. (80.6 × 60.3 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DT4224.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DT4224.jpg",
    imageAspectRatio: 0.748,
    creditLine:
      "The Walter H. and Leonore Annenberg Collection, Gift of Walter H. Annenberg, 1997, Bequest of Walter H. Annenberg, 2002",
    tags: ["Profiles", "Women"],
  }),
  curatedArtwork({
    id: 438009,
    accessionNumber: "2003.20.8",
    title:
      "The Pink Dress (Albertie-Marguerite Carré, later Madame Ferdinand-Henri Himmes, 1854–1935)",
    artist: "Berthe Morisot",
    artistBio: "French, Bourges 1841–1895 Paris",
    date: "ca. 1870",
    medium: "Oil on canvas",
    dimensions: "21 1/2 × 26 1/2 in. (54.6 × 67.3 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DT1927.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DT1927.jpg",
    imageAspectRatio: 1.247,
    creditLine:
      "The Walter H. and Leonore Annenberg Collection, Bequest of Walter H. and Leonore Annenberg, 2002",
    tags: ["Portraits", "Women"],
  }),
  curatedArtwork({
    id: 436449,
    accessionNumber: "1993.400.3",
    title: "The Siesta",
    artist: "Paul Gauguin",
    artistBio: "French, Paris 1848–1903 Atuona, Hiva Oa, Marquesas Islands",
    date: "ca. 1892–94",
    medium: "Oil on canvas",
    dimensions: "35 × 45 3/4 in. (88.9 × 116.2 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DT1952.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DT1952.jpg",
    imageAspectRatio: 1.307,
    creditLine:
      "The Walter H. and Leonore Annenberg Collection, Gift of Walter H. Annenberg, 1993, Bequest of Walter H. Annenberg, 2002",
    tags: ["Women", "Baskets", "Irons"],
  }),
  curatedArtwork({
    id: 437984,
    accessionNumber: "1996.435",
    title:
      "La Berceuse (Woman Rocking a Cradle; Augustine-Alix Pellicot Roulin, 1851–1930)",
    artist: "Vincent van Gogh",
    artistBio: "Dutch, Zundert 1853–1890 Auvers-sur-Oise",
    date: "1889",
    medium: "Oil on canvas",
    dimensions: "36 1/2 × 29 in. (92.7 × 73.7 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP-19279-001.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP-19279-001.jpg",
    imageAspectRatio: 0.795,
    creditLine:
      "The Walter H. and Leonore Annenberg Collection, Bequest of Walter H. and Leonore Annenberg, 1996",
    tags: ["Portraits", "Women", "Flowers"],
  }),
  curatedArtwork({
    id: 437997,
    accessionNumber: "2001.202.3",
    title: "Asters and Fruit on a Table",
    artist: "Henri Fantin-Latour",
    artistBio: "French, Grenoble 1836–1904 Buré",
    date: "1868",
    medium: "Oil on canvas",
    dimensions: "22 3/8 × 21 5/8 in. (56.8 × 54.9 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DT9199.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DT9199.jpg",
    imageAspectRatio: 0.967,
    creditLine:
      "The Walter H. and Leonore Annenberg Collection, Bequest of Walter H. Annenberg, 2001",
    tags: ["Apples", "Grapes", "Pears", "Flowers", "Still Life"],
  }),
  curatedArtwork({
    id: 436964,
    accessionNumber: "89.21.3",
    title: "Young Lady in 1866",
    artist: "Edouard Manet",
    artistBio: "French, Paris 1832–1883 Paris",
    date: "1866",
    medium: "Oil on canvas",
    dimensions: "72 7/8 × 50 5/8 in. (185.1 × 128.6 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP273977.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP273977.jpg",
    imageAspectRatio: 0.695,
    creditLine: "Gift of Erwin Davis, 1889",
    tags: ["Portraits", "Women", "Parrots"],
  }),
  curatedArtwork({
    id: 436162,
    accessionNumber: "29.100.43",
    title: "Sulking",
    artist: "Edgar Degas",
    artistBio: "French, Paris 1834–1917 Paris",
    date: "ca. 1870",
    medium: "Oil on canvas",
    dimensions: "12 3/4 × 18 1/4 in. (32.4 × 46.4 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP-25463-001.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP-25463-001.jpg",
    imageAspectRatio: 1.432,
    creditLine:
      "H. O. Havemeyer Collection, Bequest of Mrs. H. O. Havemeyer, 1929",
    tags: ["Interiors", "Men", "Women", "Reading"],
  }),
  curatedArtwork({
    id: 436536,
    accessionNumber: "1995.535",
    title: "Women Picking Olives",
    artist: "Vincent van Gogh",
    artistBio: "Dutch, Zundert 1853–1890 Auvers-sur-Oise",
    date: "1889",
    medium: "Oil on canvas",
    dimensions: "28 5/8 × 36 in. (72.7 × 91.4 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DP-17161-001.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DP-17161-001.jpg",
    imageAspectRatio: 1.257,
    creditLine:
      "The Walter H. and Leonore Annenberg Collection, Bequest of Walter H. Annenberg, 1995",
    tags: ["Women", "Olive Trees", "Ladders"],
  }),
  curatedArtwork({
    id: 436157,
    accessionNumber: "29.100.556",
    title: "Dancer in Ukrainian Dress",
    artist: "Edgar Degas",
    artistBio: "French, Paris 1834–1917 Paris",
    date: "1899",
    medium: "Pastel over charcoal on tracing paper",
    dimensions: "24 3/8 × 18 in. (61.9 × 45.7 cm)",
    department: "European Paintings",
    classification: "Drawings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/77I_052R2M.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/77I_052R2M.jpg",
    imageAspectRatio: 0.738,
    creditLine:
      "H. O. Havemeyer Collection, Bequest of Mrs. H. O. Havemeyer, 1929",
    tags: ["Women", "Dancing", "Dancers"],
  }),
  curatedArtwork({
    id: 283626,
    accessionNumber: "2000.13",
    title: "[Oak Tree and Rocks, Forest of Fontainebleau]",
    artist: "Gustave Le Gray",
    artistBio: "French, 1820–1884",
    date: "1849–52",
    medium: "Salted paper print from paper negative",
    dimensions: "25.2 × 35.7 cm (9 15/16 × 14 1/16 in.)",
    department: "Photographs",
    classification: "Photographs",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ph/original/DT1155.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ph/web-large/DT1155.jpg",
    imageAspectRatio: 1.417,
    creditLine:
      "Purchase, Jennifer and Joseph Duke and Lila Acheson Wallace Gifts, 2000",
    tags: ["Forests", "Landscapes", "Oaks"],
  }),
  curatedArtwork({
    id: 345033,
    accessionNumber: "56.608.1",
    title:
      "Apulegio volgare, diuiso in undeci libri, novamente stampato & in molti lochi aggiontoui che nella prima impressione gli manchaua, & de molte più figure adornato",
    displayTitle: "Apuleius, 1519 edition",
    artist: "Lucius Madaurensis Apuleius",
    artistBio: "M'Daourouch, Algeria ca. 124–after 170",
    date: "September 3, 1519",
    medium: "Printed book with woodcut illustrations",
    dimensions: "5 7/8 × 3 15/16 × 13/16 in. (15 × 10 × 2 cm)",
    department: "Drawings and Prints",
    classification: "Books",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/dp/original/DP108973.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/dp/web-large/DP108973.jpg",
    imageAspectRatio: 1,
    creditLine:
      "The Elisha Whittelsey Collection, The Elisha Whittelsey Fund, 1956",
    tags: ["Books", "Woodcuts"],
  }),
  curatedArtwork({
    id: 436155,
    accessionNumber: "29.160.26",
    title: "The Rehearsal of the Ballet Onstage",
    artist: "Edgar Degas",
    artistBio: "French, Paris 1834–1917 Paris",
    date: "ca. 1874",
    medium:
      "Oil colors freely mixed with turpentine, with traces of watercolor and pastel over pen-and-ink drawing",
    dimensions: "21 3/8 × 28 3/4 in. (54.3 × 73 cm)",
    department: "European Paintings",
    classification: "Drawings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DT1565.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DT1565.jpg",
    imageAspectRatio: 1.344,
    creditLine: "H. O. Havemeyer Collection, Gift of Horace Havemeyer, 1929",
    tags: ["Men", "Women", "Dancing", "Dancers", "Ballet"],
  }),
  curatedArtwork({
    id: 436525,
    accessionNumber: "1993.400.4",
    title: "Bouquet of Flowers in a Vase",
    artist: "Vincent van Gogh",
    artistBio: "Dutch, Zundert 1853–1890 Auvers-sur-Oise",
    date: "1890",
    medium: "Oil on canvas",
    dimensions: "25 5/8 × 21 1/4 in. (65.1 × 54 cm)",
    department: "European Paintings",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ep/original/DT7098.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ep/web-large/DT7098.jpg",
    imageAspectRatio: 0.829,
    creditLine:
      "The Walter H. and Leonore Annenberg Collection, Gift of Walter H. Annenberg, 1993, Bequest of Walter H. Annenberg, 2002",
    tags: ["Flowers", "Still Life"],
  }),
  curatedArtwork({
    id: 55176,
    accessionNumber: "JP3192",
    title: "Print",
    displayTitle: "Print / Meiji period",
    artist: "Tsuneshige",
    artistBio: "Japanese",
    date: "ca. 1900",
    culture: "Japan",
    period: "Meiji period (1868–1912)",
    medium: "Woodblock print; ink and color on paper",
    dimensions: "12 7/8 × 8 7/8 in. (32.7 × 22.5 cm)",
    department: "Asian Art",
    classification: "Prints",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/as/original/DP143854.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/as/web-large/DP143854.jpg",
    imageAspectRatio: 0.688,
    creditLine: "Gift of Lincoln Kirstein, 1959",
    tags: ["Men", "Women"],
  }),
  curatedArtwork({
    id: 58230,
    accessionNumber: "JP1092.33",
    title: "Print",
    displayTitle: "Print / Edo period",
    artist: "Utagawa Kunisada",
    artistBio: "Japanese, 1786–1864",
    culture: "Japan",
    period: "Edo period (1615–1868)",
    medium: "Woodblock print; ink and color on paper",
    dimensions: "Image: 14 1/16 × 9 7/8 in. (35.7 × 25.1 cm)",
    department: "Asian Art",
    classification: "Prints",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/as/original/DP149237.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/as/web-large/DP149237.jpg",
    imageAspectRatio: 1.422,
    creditLine: "Museum Accession",
    tags: ["Human Figures", "Balconies", "Lanterns"],
  }),
  curatedArtwork({
    id: 359362,
    accessionNumber: "1972.636",
    title: "Landscape",
    displayTitle: "Landscape / Degas",
    artist: "Edgar Degas",
    artistBio: "French, Paris 1834–1917 Paris",
    date: "1892",
    medium: "Monotype in oil colors, heightened with pastel",
    dimensions: "sheet: 10 × 13 3/8 in. (25.4 × 34 cm)",
    department: "Drawings and Prints",
    classification: "Prints",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/dp/original/DP815958.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/dp/web-large/DP815958.jpg",
    imageAspectRatio: 1.339,
    creditLine: "Purchase, Mr. and Mrs. Richard J. Bernhard Gift, 1972",
    tags: ["Landscapes"],
  }),
  curatedArtwork({
    id: 334002,
    accessionNumber: "35.42",
    title: "Seated Giant",
    artist: "Goya (Francisco de Goya y Lucientes)",
    artistBio: "Spanish, Fuendetodos 1746–1828 Bordeaux",
    date: "by 1818 (possibly 1814–18)",
    medium:
      "Burnished aquatint, scraper, roulette, lavis (along the top of the landscape and within the landscape)",
    dimensions:
      "Plate: 11 3/16 × 8 3/16 in. (28.4 × 20.8 cm); framed: 21 3/4 × 19 in. (55.2 × 48.3 cm)",
    department: "Drawings and Prints",
    classification: "Prints",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/dp/original/DP819677.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/dp/web-large/DP819677.jpg",
    imageAspectRatio: 0.874,
    creditLine: "Harris Brisbane Dick Fund, 1935",
    tags: ["Men", "Male Nudes"],
  }),
  curatedArtwork({
    id: 342003,
    accessionNumber: "80.3.133",
    title: "Landscape",
    displayTitle: "Landscape / Larciani",
    artist: 'Giovanni Larciani ("Master of the Kress Landscapes")',
    artistBio: "Italian, 1484–1527",
    date: "16th century",
    medium: "Red chalk",
    dimensions: "5 1/4 × 10 1/2 in. (13.3 × 26.7 cm)",
    department: "Drawings and Prints",
    classification: "Drawings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/dp/original/DP801797.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/dp/web-large/DP801797.jpg",
    imageAspectRatio: 2.008,
    creditLine: "Gift of Cornelius Vanderbilt, 1880",
    tags: ["Houses", "Towers", "Landscapes", "Trees"],
  }),
  curatedArtwork({
    id: 337844,
    accessionNumber: "1999.222",
    title: "Portrait of Nicolas Trigault in Chinese Costume",
    artist: "Peter Paul Rubens",
    artistBio: "Flemish, Siegen 1577–1640 Antwerp",
    date: "1617",
    medium:
      "Black, red, and white chalk, blue pastel, and pen and brown and black ink on light brown laid paper",
    dimensions: "17 9/16 × 9 3/4 in. (44.6 × 24.8 cm)",
    department: "Drawings and Prints",
    classification: "Drawings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/dp/original/DP820062.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/dp/web-large/DP820062.jpg",
    imageAspectRatio: 0.556,
    creditLine:
      "Purchase, Carl Selden Trust, several members of The Chairman's Council, Gail and Parker Gilbert, and Lila Acheson Wallace Gifts, 1999",
    tags: ["Men", "Portraits"],
  }),
  curatedArtwork({
    id: 54344,
    accessionNumber: "JP1137",
    title: "Print",
    displayTitle: "Print / Surimono",
    artist: "Yashima Gakutei",
    artistBio: "Japanese, 1786?–1868",
    date: "ca. 1830",
    culture: "Japan",
    period: "Edo period (1615–1868)",
    medium: "Woodblock print (surimono); ink and color on paper",
    dimensions: "8 5/16 × 7 7/16 in. (21.1 × 18.9 cm)",
    department: "Asian Art",
    classification: "Prints",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/as/original/DP143393.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/as/web-large/DP143393.jpg",
    imageAspectRatio: 0.896,
    creditLine: "Rogers Fund, 1919",
    tags: ["Women", "Flowers", "Waves"],
  }),
  curatedArtwork({
    id: 55614,
    accessionNumber: "JP3419",
    title: "Print",
    displayTitle: "Print / Sadahide",
    artist: "Utagawa (Gountei) Sadahide",
    artistBio: "Japanese, 1807–1873",
    date: "1861 (Bunkyu 1, 1st month)",
    culture: "Japan",
    period: "Edo period (1615–1868)",
    medium: "Woodblock print; ink and color on paper",
    dimensions: "14 × 9 7/8 in. (35.6 × 25.1 cm)",
    department: "Asian Art",
    classification: "Prints",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/as/original/DP130176.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/as/web-large/DP130176.jpg",
    imageAspectRatio: 0.705,
    creditLine: "Gift of Lincoln Kirstein, 1962",
    tags: ["Girls", "Women", "Mirrors"],
  }),
  curatedArtwork({
    id: 56552,
    accessionNumber: "JP3071",
    title: "Print",
    displayTitle: "Print / Kiyonobu",
    artist: "Torii Kiyonobu I",
    artistBio: "Japanese, 1664–1729",
    date: "1703",
    culture: "Japan",
    period: "Edo period (1615–1868)",
    medium: "Woodblock print (hand-colored); ink and color on paper",
    dimensions: "10 3/4 × 14 1/2 in. (27.3 × 36.8 cm)",
    department: "Asian Art",
    classification: "Prints",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/as/original/DP124286.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/as/web-large/DP124286.jpg",
    imageAspectRatio: 1.348,
    creditLine: "Harris Brisbane Dick Fund and Rogers Fund, 1949",
    tags: ["Men", "Women"],
  }),
  curatedArtwork({
    id: 544448,
    accessionNumber: "29.3.1",
    title: "Large Kneeling Statue of Hatshepsut",
    displayTitle: "Statue of Hatshepsut",
    date: "ca. 1479–1458 B.C.",
    period: "New Kingdom, Dynasty 18",
    culture: "Egypt",
    medium: "Granite, paint",
    dimensions: "101 1/2 × 31 1/2 × 54 1/8 in. (257.8 × 80 × 137.5 cm)",
    department: "Egyptian Art",
    classification: "Sculpture",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/eg/original/21V_CAT092R3.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/eg/web-large/21V_CAT092R3.jpg",
    imageAspectRatio: 0.75,
    creditLine: "Rogers Fund, 1929",
    tags: ["Hatshepsut", "Pharaohs", "Sculpture", "Egypt"],
  }),
  curatedArtwork({
    id: 544227,
    accessionNumber: "17.9.1",
    title: 'Hippopotamus ("William")',
    displayTitle: 'Hippopotamus ("William")',
    date: "ca. 1961–1878 B.C.",
    period: "Middle Kingdom, Dynasty 12",
    culture: "Egypt",
    medium: "Faience",
    dimensions: "4 3/8 × 3 × 7 7/8 in. (11.2 × 7.5 × 20 cm)",
    department: "Egyptian Art",
    classification: "Ceramics",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/eg/original/DP248993.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/eg/web-large/DP248993.jpg",
    imageAspectRatio: 1.33,
    creditLine: "Gift of Edward S. Harkness, 1917",
    tags: ["Hippopotamus", "Animals", "Faience", "Egypt"],
  }),
  curatedArtwork({
    id: 253370,
    accessionNumber: "32.11.1",
    title: "Marble statue of a kouros (youth)",
    displayTitle: "Kouros (Youth)",
    date: "ca. 590–580 B.C.",
    period: "Archaic period",
    culture: "Greek, Attic",
    medium: "Marble, Naxian",
    dimensions: "76 5/8 × 20 5/16 × 24 7/8 in. (194.6 × 51.6 × 63.2 cm)",
    department: "Greek and Roman Art",
    classification: "Sculpture",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/gr/original/DP-23263-005.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/gr/web-large/DP-23263-005.jpg",
    imageAspectRatio: 0.65,
    creditLine: "Fletcher Fund, 1932",
    tags: ["Men", "Sculpture", "Greece", "Kouros"],
  }),
  curatedArtwork({
    id: 24953,
    accessionNumber: "1993.14",
    title:
      "Short Sword (Yatagan) from the Court of Süleyman the Magnificent (reigned 1520–66)",
    displayTitle: "Imperial Yatagan Sword",
    artist: "Ahmed Tekelü",
    date: "ca. 1525–30",
    culture: "Turkish, Istanbul",
    medium: "Steel, walrus ivory, gold, silver, rubies, turquoise, pearls",
    dimensions: "L. 26 1/8 in. (66.4 cm)",
    department: "Arms and Armor",
    classification: "Swords",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/aa/original/DP216853.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/aa/web-large/DP216853.jpg",
    imageAspectRatio: 1.55,
    creditLine: "Purchase, The Sulzberger Foundation Inc. Gift, 1993",
    tags: ["Swords", "Ottoman", "Arms", "Gold"],
  }),
  curatedArtwork({
    id: 35,
    accessionNumber: "04.1",
    title: "The Adams Vase",
    displayTitle: "The Adams Vase",
    artist: "Designed by Paulding Farnham, manufactured by Tiffany & Co.",
    date: "1893–95",
    medium:
      "Gold, enamel, amethysts, spessartites, tourmalines, freshwater pearls",
    dimensions: "19 1/2 × 13 × 9 1/4 in. (49.5 × 33 × 23.5 cm)",
    department: "American Decorative Arts",
    classification: "Metalwork",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ad/original/DP162517.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ad/web-large/DP162517.jpg",
    imageAspectRatio: 0.82,
    creditLine: "Gift of Edward D. Adams, 1904",
    tags: ["Vases", "Gold", "Tiffany", "Decorative Arts"],
  }),
  curatedArtwork({
    id: 449537,
    accessionNumber: "39.20",
    title: "Mihrab (Prayer Niche)",
    displayTitle: "Mihrab (Prayer Niche)",
    date: "A.H. 755/A.D. 1354–55",
    culture: "Iran, Isfahan",
    medium: "Mosaic of polychrome-glazed cut tiles on composite body",
    dimensions: "135 1/16 × 113 11/16 in. (343.1 × 288.7 cm)",
    department: "Islamic Art",
    classification: "Ceramics",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/is/original/DP235035.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/is/web-large/DP235035.jpg",
    imageAspectRatio: 0.78,
    creditLine: "Harris Brisbane Dick Fund, 1939",
    tags: ["Architecture", "Tiles", "Islamic Art", "Calligraphy"],
  }),
  curatedArtwork({
    id: 467642,
    accessionNumber: "37.80.6",
    title: "The Unicorn Rests in a Garden (from the Unicorn Tapestries)",
    displayTitle: "The Unicorn in Captivity",
    date: "1495–1505",
    culture: "South Netherlandish",
    medium: "Wool warp with wool, silk, metallic threads",
    dimensions: "144 7/8 × 99 in. (368 × 251.5 cm)",
    department: "The Cloisters",
    classification: "Textiles-Tapestries",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/cl/original/DP118991.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/cl/web-large/DP118991.jpg",
    imageAspectRatio: 0.78,
    creditLine: "Gift of John D. Rockefeller Jr., 1937",
    tags: ["Unicorns", "Tapestries", "Medieval", "Flowers"],
  }),
  curatedArtwork({
    id: 501788,
    accessionNumber: "89.4.1219",
    title: "Grand Piano",
    displayTitle: "Cristofori Grand Piano",
    artist: "Bartolomeo Cristofori",
    artistBio: "Italian, Padua 1655–1732 Florence",
    date: "1720",
    culture: "Italian, Florence",
    medium: "Spruce, cypress, boxwood",
    dimensions: "Length 89 3/4 in. (228 cm)",
    department: "Musical Instruments",
    classification: "Chordophone-Zither-struck-piano",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/mi/original/DP300941.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/mi/web-large/DP300941.jpg",
    imageAspectRatio: 1.45,
    creditLine: "The Crosby Brown Collection of Musical Instruments, 1889",
    tags: ["Musical Instruments", "Piano", "Florence"],
  }),
  curatedArtwork({
    id: 318622,
    accessionNumber: "1978.412.323",
    title: "Pendant mask of Ìyọ́bà Idià",
    displayTitle: "Queen Mother Pendant Mask (Iyoba)",
    date: "16th century",
    culture: "Edo peoples, Court of Benin",
    medium: "Ivory, iron, copper",
    dimensions: "H. 9 3/8 in. (23.8 cm)",
    department: "Arts of Africa, Oceania, and the Americas",
    classification: "Ivories-Sculpture",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/ao/original/DP231460.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/ao/web-large/DP231460.jpg",
    imageAspectRatio: 0.65,
    creditLine: "The Michael C. Rockefeller Memorial Collection, 1978",
    tags: ["Masks", "Benin", "Ivory", "Queens"],
  }),
  curatedArtwork({
    id: 322609,
    accessionNumber: "32.143.2",
    title: "Human-headed winged lion (lamassu)",
    displayTitle: "Winged Lion (Lamassu)",
    date: "ca. 883–859 B.C.",
    culture: "Assyrian, Nimrud",
    medium: "Gypsum alabaster",
    dimensions: "123 × 24 1/2 × 122 1/2 in. (312.4 × 62.2 × 311.2 cm)",
    department: "Ancient West Asian Art",
    classification: "Sculpture",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/an/original/DT880.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/an/web-large/DT880.jpg",
    imageAspectRatio: 0.92,
    creditLine: "Gift of John D. Rockefeller Jr., 1932",
    tags: ["Lions", "Sculpture", "Assyrian", "Wings"],
  }),
  curatedArtwork({
    id: 193606,
    accessionNumber: "17.190.636",
    title: "Celestial globe with clockwork",
    displayTitle: "Celestial Globe Clock",
    artist: "Gerhard Emmoser",
    date: "1579",
    culture: "Austrian, Vienna",
    medium: "Gilded brass, silver",
    dimensions: "10 3/4 × 8 × 7 1/2 in. (27.3 × 20.3 × 19.1 cm)",
    department: "European Sculpture and Decorative Arts",
    classification: "Horology",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/es/original/DP231286.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/es/web-large/DP231286.jpg",
    imageAspectRatio: 0.78,
    creditLine: "Gift of J. Pierpont Morgan, 1917",
    tags: ["Clocks", "Globes", "Astronomy", "Brass"],
  }),
  curatedArtwork({
    id: 459055,
    accessionNumber: "1975.1.113",
    title: "The Annunciation",
    displayTitle: "The Annunciation",
    artist: "Hans Memling",
    artistBio: "Netherlandish, Seligenstadt ca. 1430/40–1494 Bruges",
    date: "ca. 1465–70",
    medium: "Oil on wood, transferred to canvas",
    dimensions: "30 1/8 × 21 1/2 in. (76.5 × 54.6 cm)",
    department: "The Robert Lehman Collection",
    classification: "Paintings",
    primaryImage:
      "https://images.metmuseum.org/CRDImages/rl/original/DP-40424-001.jpg",
    primaryImageSmall:
      "https://images.metmuseum.org/CRDImages/rl/web-large/DP-40424-001.jpg",
    imageAspectRatio: 0.75,
    creditLine: "Robert Lehman Collection, 1975",
    tags: ["Annunciation", "Virgin Mary", "Angels"],
  }),
] satisfies Artwork[];

export const curatedObjectIds = curatedArtworks.map((artwork) => artwork.id);

export const featuredArtwork = curatedArtworks[0];

/* Order is load-bearing: each position maps to a hand-tuned CSS grid slot
 * (.home-gallery__item--1..12 in styles.css — spans + editorial offsets).
 * Reordering reshuffles the wall; adding/removing requires a stylesheet
 * slot in step (pinned by home-gallery.test.ts). */
export const homeGalleryIds = [
  436880, 56353, 436964, 283626, 345033, 55176, 437999, 436536, 438009, 436155,
  435877, 441104,
] as const;

export const curatedPaths = [
  {
    slug: "van-gogh-late-light",
    label: "A painter, in three seasons",
    title: "Van Gogh / late light",
    description:
      "Sunflowers, irises, roses: a compact room for looking at color change.",
    artworkIds: [436524, 436528, 436534],
  },
  {
    slug: "image-becomes-icon",
    label: "One image, many names",
    title: "An image becomes an icon",
    description:
      "How a woodblock print keeps moving through culture, language, and memory.",
    artworkIds: [56353, 55176, 58230],
  },
  {
    slug: "portrait-ledger",
    label: "Faces held in paint",
    title: "The portrait ledger",
    description:
      "Quiet encounters with the sitter, the maker, and the work’s own history.",
    artworkIds: [437386, 437430, 438002],
  },
  {
    slug: "objects-not-paintings",
    label: "Things that outlast a room",
    title: "Objects, not just paintings",
    description:
      "A photograph, a book, and the material traces that widen the collection.",
    artworkIds: [283626, 345033, 436155],
  },
] as const;
