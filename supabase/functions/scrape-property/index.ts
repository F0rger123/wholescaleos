import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let { url } = await req.json();

    if (!url) {
      throw new Error('URL is required');
    }

    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    console.log(`Scraping URL: ${url}`);
    
    // Very stealthy headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const html = await response.text();
    
    // --- 1. JSON-LD STRUCTURED DATA PARSING ---
    let jsonLdData: any = {};
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        // Often schema.org injects an array or a single object. We want "RealEstateListing", "SingleFamilyResidence", "Product", etc.
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (item['@type'] && typeof item['@type'] === 'string' && (item['@type'].includes('Residence') || item['@type'].includes('Product') || item['@type'] === 'RealEstateListing')) {
             jsonLdData = { ...jsonLdData, ...item };
          }
        }
      } catch (e) {
        // Ignore parse errors on bad json
      }
    }

    // --- 2. OPENGRAPH TAGS ---
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i) 
                    || html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
                   || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const description = descMatch ? descMatch[1] : '';

    const imgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) 
                  || html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const imageUrl = imgMatch ? imgMatch[1] : (jsonLdData.image ? (Array.isArray(jsonLdData.image) ? jsonLdData.image[0] : jsonLdData.image) : '');

    // --- 3. DATA EXTRACTION ---
    let address = title.split('|')[0].replace(/zillow/i, '').replace(/realtor\.com/i, '').replace(/homes\.com/i, '').replace(/redfin/i, '').trim();
    if (jsonLdData.name) address = jsonLdData.name;
    if (jsonLdData.address && typeof jsonLdData.address === 'object' && jsonLdData.address.streetAddress) {
       address = `${jsonLdData.address.streetAddress}, ${jsonLdData.address.addressLocality}, ${jsonLdData.address.addressRegion} ${jsonLdData.address.postalCode}`;
    }

    if (!address) address = 'Property Address Not Found';

    let bedrooms = 0;
    let bathrooms = 0;
    let sqft = 0;
    let price = 0;

    // BEDROOMS
    if (jsonLdData.numberOfRooms && jsonLdData.numberOfRooms.value) bedrooms = parseInt(jsonLdData.numberOfRooms.value);
    else if (jsonLdData.numberOfBedrooms) bedrooms = parseInt(jsonLdData.numberOfBedrooms);
    else {
      const bedsDesc = description.match(/(\d+)\s+beds?/i);
      const bedsHtml = html.match(/"beds":\s*(\d+)/i) || html.match(/>(\d+)\s*bd</i) || html.match(/>(\d+)\s*beds?</i);
      if (bedsDesc) bedrooms = parseInt(bedsDesc[1]);
      else if (bedsHtml) bedrooms = parseInt(bedsHtml[1]);
    }

    // BATHROOMS
    if (jsonLdData.numberOfBathroomsTotal) bathrooms = parseFloat(jsonLdData.numberOfBathroomsTotal);
    else {
      const bathsDesc = description.match(/(\d+(?:\.\d+)?)\s+baths?/i);
      const bathsHtml = html.match(/"baths":\s*(\d+(?:\.\d+)?)/i) || html.match(/>(\d+(?:\.\d+)?)\s*ba</i) || html.match(/>(\d+(?:\.\d+)?)\s*baths?</i);
      if (bathsDesc) bathrooms = parseFloat(bathsDesc[1]);
      else if (bathsHtml) bathrooms = parseFloat(bathsHtml[1]);
    }

    // SQFT
    if (jsonLdData.floorSize && jsonLdData.floorSize.value) sqft = parseInt(jsonLdData.floorSize.value);
    else {
      const sqftDesc = description.match(/([,0-9]+)\s+sq\s*ft/i);
      const sqftHtml = html.match(/"livingArea":\s*(\d+)/i) || html.match(/>([,0-9]+)\s*sqft</i) || html.match(/([,0-9]+)\s*sq\.?\s*ft\.?/i);
      if (sqftDesc) sqft = parseInt(sqftDesc[1].replace(/,/g, ''));
      else if (sqftHtml) sqft = parseInt(sqftHtml[1].replace(/,/g, ''));
    }

    // PRICE
    if (jsonLdData.offers && jsonLdData.offers.price) price = parseInt(jsonLdData.offers.price);
    else {
      const priceDesc = description.match(/\$(\d{1,3}(?:,\d{3})+)(?!.*\/mo)/i);
      const priceHtml = html.match(/"price":\s*(\d+)/i) || html.match(/>\$(\d{1,3}(?:,\d{3})+)</i) || html.match(/price["']?\s*:\s*["']?(\d+)/i);
      if (priceDesc) price = parseInt(priceDesc[1].replace(/,/g, ''));
      else if (priceHtml) price = parseInt(priceHtml[1].replace(/,/g, ''));
    }

    const propertyData = {
      address,
      bedrooms: bedrooms || undefined,
      bathrooms: bathrooms || undefined,
      sqft: sqft || undefined,
      price: price || undefined,
      description,
      imageUrl,
      url,
      source: url.toLowerCase().includes('zillow') ? 'Zillow' : url.toLowerCase().includes('homes.com') ? 'Homes.com' : url.toLowerCase().includes('redfin') ? 'Redfin' : url.toLowerCase().includes('realtor.com') ? 'Realtor.com' : 'Web Scraper'
    };

    return new Response(
      JSON.stringify(propertyData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
