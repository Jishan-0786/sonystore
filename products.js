/**
 * SONY STORE - Luxury Watch Database
 * Contains 12 luxury watch models with full specs, stock status, and multiple high-res image angles.
 */

// Helper to generate SVG visual representations for watch photos
function createWatchSvgDataUri(colorScheme, watchType) {
    const primary = colorScheme.primary || '#d4af37';
    const secondary = colorScheme.secondary || '#1e2230';
    const accent = colorScheme.accent || '#ffffff';
    const bg = colorScheme.bg || '#0d0f17';
    
    // SVG template for luxury watch rendering
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
        <defs>
            <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="${primary}" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
            </radialGradient>
            <linearGradient id="metalBezel" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f5d77f"/>
                <stop offset="30%" stop-color="${primary}"/>
                <stop offset="70%" stop-color="#8a6d1b"/>
                <stop offset="100%" stop-color="#e6ca65"/>
            </linearGradient>
            <linearGradient id="dialGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="${secondary}"/>
                <stop offset="100%" stop-color="#08090d"/>
            </linearGradient>
            <linearGradient id="strapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#141722"/>
                <stop offset="50%" stop-color="#2a2e3d"/>
                <stop offset="100%" stop-color="#141722"/>
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="15" stdDeviation="20" flood-color="#000" flood-opacity="0.6"/>
            </filter>
        </defs>

        <!-- Background -->
        <rect width="600" height="600" fill="${bg}"/>
        <circle cx="300" cy="300" r="280" fill="url(#bgGlow)"/>

        <g filter="url(#shadow)">
            <!-- Top Strap -->
            <rect x="230" y="40" width="140" height="150" rx="10" fill="url(#strapGrad)" stroke="${primary}" stroke-opacity="0.3" stroke-width="2"/>
            <!-- Bottom Strap -->
            <rect x="230" y="410" width="140" height="150" rx="10" fill="url(#strapGrad)" stroke="${primary}" stroke-opacity="0.3" stroke-width="2"/>

            <!-- Outer Bezel -->
            <circle cx="300" cy="300" r="170" fill="url(#metalBezel)"/>
            <circle cx="300" cy="300" r="158" fill="#11131a"/>
            <circle cx="300" cy="300" r="152" fill="url(#metalBezel)"/>

            <!-- Dial Face -->
            <circle cx="300" cy="300" r="145" fill="url(#dialGrad)" stroke="${primary}" stroke-width="1.5"/>

            <!-- Dial Markers & Hour Ticks -->
            ${Array.from({length: 12}).map((_, i) => {
                const angle = i * 30 * Math.PI / 180;
                const x1 = 300 + 130 * Math.sin(angle);
                const y1 = 300 - 130 * Math.cos(angle);
                const x2 = 300 + 140 * Math.sin(angle);
                const y2 = 300 - 140 * Math.cos(angle);
                return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${primary}" stroke-width="${i % 3 === 0 ? 4 : 2}" stroke-linecap="round"/>`;
            }).join('')}

            <!-- Sub-dials (for Chronograph/Automatic) -->
            ${watchType === 'chronograph' || watchType === 'automatic' ? `
                <circle cx="250" cy="300" r="32" fill="#090b10" stroke="${primary}" stroke-width="1"/>
                <line x1="250" y1="300" x2="262" y2="292" stroke="${accent}" stroke-width="2"/>

                <circle cx="350" cy="300" r="32" fill="#090b10" stroke="${primary}" stroke-width="1"/>
                <line x1="350" y1="300" x2="340" y2="310" stroke="${accent}" stroke-width="2"/>

                <circle cx="300" cy="350" r="28" fill="#090b10" stroke="${primary}" stroke-width="1"/>
                <line x1="300" y1="350" x2="300" y2="330" stroke="${primary}" stroke-width="1.5"/>
            ` : ''}

            <!-- Brand Logo Text -->
            <text x="300" y="235" font-family="'Cinzel', serif" font-size="14" font-weight="700" fill="${primary}" text-anchor="middle" letter-spacing="3">SONY STORE</text>
            <text x="300" y="250" font-family="sans-serif" font-size="8" fill="#8a94a6" text-anchor="middle" letter-spacing="2">SWISS MADE</text>

            <!-- Watch Hands -->
            <!-- Hour Hand -->
            <line x1="300" y1="300" x2="240" y2="240" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>
            <line x1="300" y1="300" x2="240" y2="240" stroke="${primary}" stroke-width="2" stroke-linecap="round"/>

            <!-- Minute Hand -->
            <line x1="300" y1="300" x2="370" y2="190" stroke="${accent}" stroke-width="4" stroke-linecap="round"/>
            <line x1="300" y1="300" x2="370" y2="190" stroke="${primary}" stroke-width="1.5" stroke-linecap="round"/>

            <!-- Second Hand -->
            <line x1="300" y1="300" x2="290" y2="160" stroke="#e63946" stroke-width="2" stroke-linecap="round"/>
            <circle cx="300" cy="300" r="6" fill="${primary}"/>
            <circle cx="300" cy="300" r="3" fill="#ffffff"/>

            <!-- Glass Reflection Overlay -->
            <path d="M 180 180 A 145 145 0 0 1 420 220 C 350 280 230 250 180 180 Z" fill="#ffffff" fill-opacity="0.06"/>
        </g>
    </svg>`;
    
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const defaultProducts = [
    {
        id: 1,
        name: "SONY STORE Royal Tourbillon",
        brand: "SONY STORE Luxury",
        price: 14500,
        oldPrice: 16800,
        description: "The crown jewel of engineering. Features an exposed flying tourbillon cage, 18k solid rose gold bezel, and hand-carved tapestry dial face.",
        images: [
            createWatchSvgDataUri({ primary: '#d4af37', secondary: '#12141d', accent: '#ffffff' }, 'automatic'),
            createWatchSvgDataUri({ primary: '#f4e4bc', secondary: '#1a1d2b', accent: '#d4af37' }, 'automatic'),
            createWatchSvgDataUri({ primary: '#b89228', secondary: '#090b10', accent: '#f5d77f' }, 'automatic')
        ],
        category: "Luxury",
        material: "18k Rose Gold & Titanium",
        movement: "Calibre CH-9001 Automatic Flying Tourbillon",
        caseSize: "42mm",
        strap: "Genuine Alligator Leather (Black)",
        waterResistance: "100m / 10 ATM",
        rating: 4.9,
        sku: "SNY-RTL-001",
        stock: 8
    },
    {
        id: 2,
        name: "SuperOcean Chronograph GMT",
        brand: "SONY STORE Sport",
        price: 8900,
        oldPrice: 9500,
        description: "Engineered for high-seas exploration and precision racing. Lightweight Grade 5 Titanium casing with anti-reflective sapphire crystal.",
        images: [
            createWatchSvgDataUri({ primary: '#00d2ff', secondary: '#0f172a', accent: '#00f2fe' }, 'chronograph'),
            createWatchSvgDataUri({ primary: '#38bdf8', secondary: '#1e293b', accent: '#ffffff' }, 'chronograph'),
            createWatchSvgDataUri({ primary: '#0284c7', secondary: '#090d16', accent: '#38bdf8' }, 'chronograph')
        ],
        category: "Sport",
        material: "Grade 5 Brushed Titanium",
        movement: "High-Beat Chronograph Movement",
        caseSize: "44mm",
        strap: "Vulcanized Endurance Rubber",
        waterResistance: "300m / 30 ATM",
        rating: 4.8,
        sku: "SNY-SOC-002",
        stock: 3
    },
    {
        id: 3,
        name: "Heritage Classic 1952",
        brand: "SONY STORE Heritage",
        price: 12200,
        oldPrice: null,
        description: "A tribute to timeless mid-century elegance. Minimalist champagne dial paired with hand-stitched Tuscan calfskin leather.",
        images: [
            createWatchSvgDataUri({ primary: '#e5c07b', secondary: '#211d17', accent: '#ffffff' }, 'classic'),
            createWatchSvgDataUri({ primary: '#d4af37', secondary: '#14120e', accent: '#e5c07b' }, 'classic'),
            createWatchSvgDataUri({ primary: '#f3e5ab', secondary: '#2e271d', accent: '#ffffff' }, 'classic')
        ],
        category: "Classic",
        material: "Polished Yellow Gold & Stainless Steel",
        movement: "Hand-Wound Calibre 1952",
        caseSize: "39mm",
        strap: "Tuscan Calfskin Leather",
        waterResistance: "50m / 5 ATM",
        rating: 4.7,
        sku: "SNY-HC-003",
        stock: 12
    },
    {
        id: 4,
        name: "Shadow Ceramic Minimalist",
        brand: "SONY STORE Minimal",
        price: 5400,
        oldPrice: 6200,
        description: "Stealth luxury at its absolute finest. Scratch-resistant matte ceramic dial with deep obsidian indices and ultralight mesh band.",
        images: [
            createWatchSvgDataUri({ primary: '#94a3b8', secondary: '#090a0f', accent: '#e2e8f0' }, 'minimal'),
            createWatchSvgDataUri({ primary: '#cbd5e1', secondary: '#13151f', accent: '#ffffff' }, 'minimal'),
            createWatchSvgDataUri({ primary: '#64748b', secondary: '#050608', accent: '#94a3b8' }, 'minimal')
        ],
        category: "Minimal",
        material: "Hi-Tech Matte Black Ceramic",
        movement: "Precision Ultra-Slim Swiss Quartz",
        caseSize: "40mm",
        strap: "Ion-Plated Stainless Steel Mesh",
        waterResistance: "50m / 5 ATM",
        rating: 4.6,
        sku: "SNY-SCM-004",
        stock: 15
    },
    {
        id: 5,
        name: "Lumina Skeleton Automatic",
        brand: "SONY STORE Luxury",
        price: 18900,
        oldPrice: 21000,
        description: "Fully openwork skeletonized dial revealing every gear wheel, spring, and jewel. Encased in double anti-glare sapphire crystal.",
        images: [
            createWatchSvgDataUri({ primary: '#e2e8f0', secondary: '#0f172a', accent: '#38bdf8' }, 'automatic'),
            createWatchSvgDataUri({ primary: '#94a3b8', secondary: '#1e293b', accent: '#ffffff' }, 'automatic'),
            createWatchSvgDataUri({ primary: '#f8fafc', secondary: '#020617', accent: '#0284c7' }, 'automatic')
        ],
        category: "Automatic",
        material: "Platinum & Sapphire Crystal",
        movement: "In-House Skeletonized Calibre SK-88",
        caseSize: "41mm",
        strap: "Hand-Crafted Alligator Strap",
        waterResistance: "100m / 10 ATM",
        rating: 5.0,
        sku: "SNY-LSA-005",
        stock: 2
    },
    {
        id: 6,
        name: "Monaco Carbon Chrono",
        brand: "SONY STORE Racing",
        price: 11000,
        oldPrice: 12500,
        description: "Forged carbon case with racing red indices and flyback chronograph complication. Designed for track performance.",
        images: [
            createWatchSvgDataUri({ primary: '#ef4444', secondary: '#18181b', accent: '#ffffff' }, 'chronograph'),
            createWatchSvgDataUri({ primary: '#f87171', secondary: '#27272a', accent: '#ef4444' }, 'chronograph'),
            createWatchSvgDataUri({ primary: '#dc2626', secondary: '#09090b', accent: '#ffffff' }, 'chronograph')
        ],
        category: "Chronograph",
        material: "Forged Carbon Fiber & Titanium",
        movement: "Flyback Chronograph Calibre R-1",
        caseSize: "43mm",
        strap: "Perforated Racing Calfskin",
        waterResistance: "100m / 10 ATM",
        rating: 4.8,
        sku: "SNY-MCC-006",
        stock: 0
    },
    {
        id: 7,
        name: "Celestial Moonphase Platinum",
        brand: "SONY STORE Astronomical",
        price: 22500,
        oldPrice: null,
        description: "Displays real-time lunar phases across a deep aventurine night sky dial. Solid platinum casing with diamond indices.",
        images: [
            createWatchSvgDataUri({ primary: '#818cf8', secondary: '#0b0f19', accent: '#c7d2fe' }, 'luxury'),
            createWatchSvgDataUri({ primary: '#a5b4fc', secondary: '#151c2e', accent: '#ffffff' }, 'luxury'),
            createWatchSvgDataUri({ primary: '#6366f1', secondary: '#05070c', accent: '#818cf8' }, 'luxury')
        ],
        category: "Luxury",
        material: "Solid Platinum 950",
        movement: "Astronomical Moonphase Calibre MP-100",
        caseSize: "40mm",
        strap: "Midnight Blue Alligator Leather",
        waterResistance: "30m / 3 ATM",
        rating: 4.9,
        sku: "SNY-CMP-007",
        stock: 5
    },
    {
        id: 8,
        name: "Vanguard GMT Pilot",
        brand: "SONY STORE Sport",
        price: 6800,
        oldPrice: 7400,
        description: "Dual time zone GMT indicator with bidirectional 24-hour ceramic bezel and luminescent Super-LumiNova markers.",
        images: [
            createWatchSvgDataUri({ primary: '#f59e0b', secondary: '#1c1917', accent: '#fef3c7' }, 'sport'),
            createWatchSvgDataUri({ primary: '#fbbf24', secondary: '#292524', accent: '#ffffff' }, 'sport'),
            createWatchSvgDataUri({ primary: '#d97706', secondary: '#0c0a09', accent: '#f59e0b' }, 'sport')
        ],
        category: "Sport",
        material: "316L Surgical Stainless Steel",
        movement: "GMT Calibre Dual Zone 2893",
        caseSize: "42mm",
        strap: "Vintage Saddle Leather",
        waterResistance: "150m / 15 ATM",
        rating: 4.7,
        sku: "SNY-VGP-008",
        stock: 10
    },
    {
        id: 9,
        name: "Sovereign Diamond Reserve",
        brand: "SONY STORE Luxury",
        price: 34000,
        oldPrice: 38000,
        description: "Exclusive limited masterwork featuring 48 baguette-cut diamonds set into an 18k white gold bezel. Handcrafted precision.",
        images: [
            createWatchSvgDataUri({ primary: '#38bdf8', secondary: '#0f172a', accent: '#ffffff' }, 'luxury'),
            createWatchSvgDataUri({ primary: '#7dd3fc', secondary: '#1e293b', accent: '#38bdf8' }, 'luxury'),
            createWatchSvgDataUri({ primary: '#0ea5e9', secondary: '#020617', accent: '#ffffff' }, 'luxury')
        ],
        category: "Luxury",
        material: "18k White Gold & Baguette Diamonds",
        movement: "Ultra-Thin Automatic Calibre S-99",
        caseSize: "38mm",
        strap: "White Gold Integrated Bracelet",
        waterResistance: "30m / 3 ATM",
        rating: 5.0,
        sku: "SNY-SDR-009",
        stock: 4
    },
    {
        id: 10,
        name: "Aero Pilot Vintage Automatic",
        brand: "SONY STORE Heritage",
        price: 7200,
        oldPrice: null,
        description: "Classic aviator dial designed for instant legibility in harsh environments. Anti-magnetic inner cage and onion crown.",
        images: [
            createWatchSvgDataUri({ primary: '#10b981', secondary: '#064e3b', accent: '#a7f3d0' }, 'automatic'),
            createWatchSvgDataUri({ primary: '#34d399', secondary: '#022c22', accent: '#ffffff' }, 'automatic'),
            createWatchSvgDataUri({ primary: '#059669', secondary: '#011710', accent: '#10b981' }, 'automatic')
        ],
        category: "Automatic",
        material: "Bronze Casing with Aged Patina",
        movement: "Calibre Aviator-40 Automatic",
        caseSize: "43mm",
        strap: "Distressed Pilot Leather Strap",
        waterResistance: "100m / 10 ATM",
        rating: 4.6,
        sku: "SNY-APV-010",
        stock: 9
    },
    {
        id: 11,
        name: "Zenith Mesh Minimalist",
        brand: "SONY STORE Minimal",
        price: 4500,
        oldPrice: 5000,
        description: "Ultra-slim 6.8mm profile with satin brushed dial finish and quick-release Milanese stainless steel mesh band.",
        images: [
            createWatchSvgDataUri({ primary: '#ec4899', secondary: '#18181b', accent: '#fbcfe8' }, 'minimal'),
            createWatchSvgDataUri({ primary: '#f472b6', secondary: '#27272a', accent: '#ffffff' }, 'minimal'),
            createWatchSvgDataUri({ primary: '#db2777', secondary: '#09090b', accent: '#ec4899' }, 'minimal')
        ],
        category: "Minimal",
        material: "Satin Brushed Stainless Steel",
        movement: "Swiss Quartz Ultra-Slim Movement",
        caseSize: "38mm",
        strap: "Milanese Steel Mesh",
        waterResistance: "30m / 3 ATM",
        rating: 4.5,
        sku: "SNY-ZMM-011",
        stock: 18
    },
    {
        id: 12,
        name: "Nautilus Rose Gold Executive",
        brand: "SONY STORE Luxury",
        price: 28900,
        oldPrice: 32000,
        description: "Iconic octagonal bezel design crafted from 18k solid rose gold. Deep sunburst navy blue dial with luminous hour markers.",
        images: [
            createWatchSvgDataUri({ primary: '#d4af37', secondary: '#030712', accent: '#93c5fd' }, 'luxury'),
            createWatchSvgDataUri({ primary: '#f3e5ab', secondary: '#0f172a', accent: '#d4af37' }, 'luxury'),
            createWatchSvgDataUri({ primary: '#b89228', secondary: '#020617', accent: '#ffffff' }, 'luxury')
        ],
        category: "Luxury",
        material: "18k Solid Rose Gold",
        movement: "Calibre CH-240 Automatic",
        caseSize: "40.5mm",
        strap: "Solid Rose Gold Bracelet",
        waterResistance: "120m / 12 ATM",
        rating: 4.9,
        sku: "SNY-NRG-012",
        stock: 6
    }
];

function getStoredProducts() {
    try {
        const stored = localStorage.getItem('sony_store_products');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {}
    localStorage.setItem('sony_store_products', JSON.stringify(defaultProducts));
    return defaultProducts;
}

function saveProductsToStorage(newProductsList) {
    localStorage.setItem('sony_store_products', JSON.stringify(newProductsList));
    products.length = 0;
    products.push(...newProductsList);
}

async function loadSupabaseProductsIfAvailable() {
    if (typeof fetchSupabaseProducts === 'function') {
        const supabaseProducts = await fetchSupabaseProducts();
        if (supabaseProducts && supabaseProducts.length > 0) {
            saveProductsToStorage(supabaseProducts);
        }
    }
}

function updateProductStockAfterOrder(items) {
    const activeProducts = getStoredProducts();
    items.forEach(item => {
        const target = activeProducts.find(p => p.id === item.id);
        if (target) {
            target.stock = Math.max(0, target.stock - item.quantity);
            if (typeof updateSupabaseProductStock === 'function') {
                updateSupabaseProductStock(item.id, target.stock);
            }
        }
    });
    saveProductsToStorage(activeProducts);
}

// Global products array synced with storage
const products = getStoredProducts();
loadSupabaseProductsIfAvailable();

// Helper functions for stock calculation
function getStockStatus(stock) {
    if (stock <= 0) {
        return { text: 'OUT OF STOCK', class: 'out-of-stock', color: '#ef4444' };
    } else if (stock <= 5) {
        return { text: `LOW STOCK — Only ${stock} left`, class: 'low-stock', color: '#f59e0b' };
    } else {
        return { text: `IN STOCK — ${stock} pieces available`, class: 'in-stock', color: '#10b981' };
    }
}
