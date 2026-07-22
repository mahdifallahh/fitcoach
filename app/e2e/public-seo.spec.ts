import { test, expect } from './helpers/test';
import { setupCoach } from './helpers/auth';

test.describe('public SEO surface', () => {
  test('robots.txt allows public pages, disallows panels, and points at the sitemap', async ({ request, baseURL }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('Disallow: /*/coach/');
    expect(body).toContain('Disallow: /*/student/');
    expect(body).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
  });

  test('sitemap.xml lists the marketing pages in both locales', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain('<urlset');
    expect(body).toContain('/fa</loc>');
    expect(body).toContain('/en</loc>');
    expect(body).toContain('/fa/blog</loc>');
  });

  test('the fa landing page carries canonical + hreflang + OG metadata', async ({ page }) => {
    await page.goto('/fa');
    await expect(page).toHaveTitle(/.+/);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="fa"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
  });

  test("a coach's public /c/<handle> page renders their profile with Person JSON-LD", async ({ page }) => {
    await setupCoach(page);
    await page.goto('/fa/coach/profile');

    // Every phone-signup coach gets an auto-generated handle immediately, so the
    // public link card is already populated — read it instead of typing one.
    const link = page.locator('#public-page code');
    await expect(link).toBeVisible();
    const publicUrl = await link.textContent();
    expect(publicUrl).toBeTruthy();
    const handle = new URL(publicUrl!).pathname.split('/').pop();

    await page.goto(`/fa/c/${handle}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
    const raw = await jsonLd.first().textContent();
    const parsed = JSON.parse(raw!);
    expect(parsed.mainEntity['@type']).toBe('Person');
  });
});
